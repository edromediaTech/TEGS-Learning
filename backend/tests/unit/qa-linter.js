#!/usr/bin/env node
/**
 * Tests unitaires — Linter 3D des composants CRNS (verrou QA n°1)
 *
 * Fixtures : le vrai composant (frontend/public/components/disjoncteur_c16_1pn) doit passer ;
 * chaque variante y introduit UN defaut (dans le manifeste ou dans le JSON du GLB) et doit
 * etre bloquee avec le bon code d'erreur.
 *
 * Usage: node tests/unit/qa-linter.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validateComponent } = require('../../src/qa/validateComponent');
const { parseGlb, imageSize } = require('../../src/qa/gltfInspect');
const lifecycle = require('../../src/services/componentLifecycle');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  ❌ ${name}\n     ${e.message}`);
  }
}

const DIR = path.join(__dirname, '../../../frontend/public/components/disjoncteur_c16_1pn');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(DIR, 'component.json'), 'utf8'));
const GLB = fs.readFileSync(path.join(DIR, 'component.glb'));

const clone = (o) => JSON.parse(JSON.stringify(o));
// Manifeste modifie ; empreinte retiree quand le GLB change (sinon ERR_MODEL_HASH masquerait le defaut vise).
function variant(mutate, { glb = GLB } = {}) {
  const manifest = clone(MANIFEST);
  if (glb !== GLB) manifest.model.sha256 = null;
  mutate?.(manifest);
  return validateComponent({ manifest, glb });
}
// Reecrit le bloc JSON d'un GLB (bloc binaire inchange).
function repackGlb(mutateJson) {
  const { json, bin } = parseGlb(GLB);
  mutateJson(json);
  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  if (jsonBuf.length % 4) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(4 - (jsonBuf.length % 4), 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  const chunk = (type, data) => { const h = Buffer.alloc(8); h.writeUInt32LE(data.length, 0); h.writeUInt32LE(type, 4); return Buffer.concat([h, data]); };
  const body = Buffer.concat([chunk(0x4e4f534a, jsonBuf), chunk(0x004e4942, bin)]);
  header.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([header, body]);
}
const nodeIndex = (json, name) => json.nodes.findIndex((n) => n.name === name);
const codes = (r) => r.errors.map((e) => e.code);
const has = (r, code, re) => r.errors.some((e) => e.code === code && (!re || re.test(e.message)));

function main() {
  console.log('\n══ Linter 3D : composant de reference ══');
  test('le disjoncteur C16 de reference est conforme', () => {
    const r = validateComponent({ manifest: MANIFEST, glb: GLB });
    assert.deepStrictEqual(r.errors, [], JSON.stringify(r.errors));
    assert.ok(r.ok);
    assert.ok(r.metrics.links_checked >= 10, 'contacts verifies');
    assert.ok(r.metrics.triangles > 0 && r.metrics.triangles <= 10000);
    assert.strictEqual(r.metrics.draco, true);
  });

  console.log('\n══ Integrite electrique : [ERR_OPEN_CIRCUIT] ══');
  test('contact fixe deplace de 5 mm -> intervalle sans contact', () => {
    const glb = repackGlb((j) => { const n = j.nodes[nodeIndex(j, 'Contact_fixe')]; n.translation = [0, -0.005, 0]; });
    const r = variant(null, { glb });
    assert.ok(has(r, 'ERR_OPEN_CIRCUIT', /intervalle sans contact/), codes(r).join());
  });
  test('liaison retiree du chemin -> chaine interrompue', () => {
    const r = variant((m) => { m.electrical.links = m.electrical.links.filter(([a]) => a !== 'bilame'); });
    assert.ok(has(r, 'ERR_OPEN_CIRCUIT', /chaine interrompue/), codes(r).join());
    assert.ok(has(r, 'ERR_OPEN_CIRCUIT', /circuit ouvert/), 'borne aval non atteinte');
  });
  test('conducteur declare mais relie a rien -> orphelin', () => {
    const r = variant((m) => { m.electrical.conductors.shunt = 'Chambre_coupure'; });
    assert.ok(has(r, 'ERR_OPEN_CIRCUIT', /orphelin/), codes(r).join());
  });
  test('contacts qui ne s\'ouvrent pas en position O -> ERR_SWITCH_STUCK', () => {
    const r = variant((m) => { m.kinematics.actuators[0].states.off = -34; });
    assert.ok(has(r, 'ERR_SWITCH_STUCK'), codes(r).join());
  });
  test('fil sorti de sa cage -> ERR_CONNECTION', () => {
    const glb = repackGlb((j) => { j.nodes[nodeIndex(j, 'Fil_cuivre_bas')].translation = [0.02, 0, 0]; });
    assert.ok(has(variant(null, { glb }), 'ERR_CONNECTION', /fil Fil_cuivre_bas/));
  });
  test('noeud inexistant dans le GLB -> ERR_UNKNOWN_NODE', () => {
    assert.ok(has(variant((m) => { m.electrical.conductors.bobine = 'Bobine_absente'; }), 'ERR_UNKNOWN_NODE'));
  });

  console.log('\n══ Continuite cinematique : [ERR_KINEMATIC_CHAIN] ══');
  test('manette dans le vide : contact mobile detache de la manette dans le GLB', () => {
    const glb = repackGlb((j) => {
      const lever = j.nodes[nodeIndex(j, 'Levier')];
      j.scenes[j.scene || 0].nodes.push(...lever.children);
      delete lever.children;
    });
    const r = variant(null, { glb });
    assert.ok(has(r, 'ERR_KINEMATIC_CHAIN', /independante dans le GLB/), codes(r).join());
  });
  test('aucune piece entrainee declaree -> l\'actionneur tournerait dans le vide', () => {
    const r = variant((m) => { m.kinematics.driven = []; });
    assert.ok(has(r, 'ERR_KINEMATIC_CHAIN', /tournerait dans le vide/), codes(r).join());
    assert.ok(r.warnings.some((w) => w.code === 'WARN_UNDECLARED_DRIVEN'), 'enfants non declares signales');
  });
  test('le TP anime un organe sans actionneur declare', () => {
    assert.ok(has(variant((m) => { m.interaction.pickable = { Levier: 'manette_fantome' }; }), 'ERR_KINEMATIC_CHAIN', /sans actionneur/));
  });
  test('piece entrainee par un actionneur inconnu', () => {
    assert.ok(has(variant((m) => { m.kinematics.driven[0].by = 'inconnu'; }), 'ERR_KINEMATIC_CHAIN'));
  });

  console.log('\n══ Sobriete : [ERR_PERF_BUDGET] ══');
  test('budget de polygones depasse', () => {
    const r = validateComponent({ manifest: MANIFEST, glb: GLB, budget: { polygons: 5000 } });
    assert.ok(has(r, 'ERR_PERF_BUDGET', /polygones/));
  });
  test('compression Draco retiree -> bloque', () => {
    const glb = repackGlb((j) => { for (const m of j.meshes) for (const p of m.primitives) delete p.extensions; });
    assert.ok(has(variant(null, { glb }), 'ERR_PERF_BUDGET', /Draco/));
  });
  test('taille d\'image lue dans les en-tetes PNG et JPEG', () => {
    const png = Buffer.alloc(32); png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(2048, 16); png.writeUInt32BE(512, 20);
    assert.deepStrictEqual(imageSize(png), { width: 2048, height: 512 });
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x00, 0x08, 0x00, 0x03]);
    assert.deepStrictEqual(imageSize(jpg), { width: 2048, height: 1024 });
  });

  console.log('\n══ Paquet et manifeste ══');
  test('GLB different de l\'empreinte du manifeste -> ERR_MODEL_HASH', () => {
    const manifest = clone(MANIFEST); manifest.model.sha256 = '0'.repeat(64);
    assert.ok(has(validateComponent({ manifest, glb: GLB }), 'ERR_MODEL_HASH'));
  });
  test('schema inconnu -> ERR_SCHEMA (aucun autre controle)', () => {
    const r = variant((m) => { m.schema = 'autre/9'; });
    assert.deepStrictEqual([...new Set(codes(r))], ['ERR_SCHEMA']);
  });

  console.log('\n══ Cycle de vie des composants ══');
  test('transitions autorisees', () => {
    assert.ok(lifecycle.canTransition('CI_PASSED', 'REVIEW_PENDING'));
    assert.ok(lifecycle.canTransition('REVIEW_PENDING', 'APPROVED'));
    assert.ok(lifecycle.canTransition('REVIEW_PENDING', 'REJECTED'));
    assert.ok(!lifecycle.canTransition('DRAFT', 'APPROVED'), 'pas d\'approbation sans linter ni revue');
    assert.ok(!lifecycle.canTransition('CI_PASSED', 'APPROVED'), 'pas d\'approbation sans revue');
  });
  test('statut apres depot : selon le rapport du linter', () => {
    assert.strictEqual(lifecycle.statusAfterLint({ ok: true }), 'CI_PASSED');
    assert.strictEqual(lifecycle.statusAfterLint({ ok: false }), 'DRAFT');
  });
  test('check-list : les 4 points obligatoires', () => {
    const all = Object.fromEntries(lifecycle.CHECKLIST.map((k) => [k, true]));
    assert.strictEqual(lifecycle.CHECKLIST.length, 4);
    assert.deepStrictEqual(lifecycle.missingChecklist(all), []);
    assert.deepStrictEqual(lifecycle.missingChecklist({ ...all, declenchement: false }), ['declenchement']);
    assert.strictEqual(lifecycle.missingChecklist({}).length, 4);
  });

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  TOTAL: ${passed + failed} tests — ✅ ${passed} passed — ❌ ${failed} failed`);
  if (failures.length > 0) {
    console.log('\n  Échecs:');
    for (const f of failures) console.log(`    ❌ ${f.name}: ${f.error}`);
  }
  console.log('══════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main();
