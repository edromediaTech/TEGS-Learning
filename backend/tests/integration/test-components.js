/**
 * TEGS-Learning - Composants 3D CRNS : linter au depot, cycle de vie, catalogue.
 *
 * Prouve que :
 *  1. le serveur execute le linter au depot (CI_PASSED / DRAFT avec rapport) ;
 *  2. les transitions respectent le cycle (pas d'approbation sans revue ni check-list complete) ;
 *  3. GET /api/v1/components/catalog ne sert QUE les composants APPROVED ;
 *  4. toute modification d'un composant approuve le retire du catalogue jusqu'a nouvelle revue.
 *
 * Pre-requis : backend demarre, MongoDB. Usage : node tests/integration/test-components.js
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const DIR = path.join(__dirname, '../../../frontend/public/components/disjoncteur_c16_1pn');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(DIR, 'component.json'), 'utf8'));
const GLB = fs.readFileSync(path.join(DIR, 'component.glb'));
const uid = Date.now().toString(36);

async function request(method, route, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${route}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data };
}

// Creation d'organisations et de comptes : jeton superadmin fourni (cf. _superadmin.js).
request = require('./_superadmin').withSuperAdmin(request);

let passed = 0;
let failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log(`  [PASS] ${name}`); } else { failed++; console.log(`  [FAIL] ${name}`); }
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const COMP = `disjoncteur_it_${uid}`;
const ALL = { chaine_cinematique: true, raccordements: true, lisibilite: true, declenchement: true };

async function run() {
  console.log('=== Composants 3D : linter, cycle de vie, catalogue ===\n');
  const t = await request('POST', '/tenants', { name: `Org composants ${uid}`, code: `CMP-${uid}` });
  const tenantId = t.data.tenant?._id;
  const reg = (email, role) => request('POST', '/auth/register', { email, password: 'Secret123!', firstName: 'A', lastName: 'B', role, tenant_id: tenantId });
  const teacher = (await reg(`prof-${uid}@t.ht`, 'teacher')).data.token;
  const admin = (await reg(`admin-${uid}@t.ht`, 'admin_ddene')).data.token;
  assert(teacher && admin, 'comptes enseignant et administrateur');

  const manifest = clone(MANIFEST); manifest.id = COMP;
  const glb_base64 = GLB.toString('base64');

  console.log('\n--- Depot : linter execute par le serveur ---');
  const anon = await request('POST', '/v1/components', { manifest, glb_base64 });
  assert(anon.status === 401, 'depot anonyme refuse (401)');
  const up = await request('POST', '/v1/components', { manifest, glb_base64 }, teacher);
  assert(up.status === 201 && up.data.component.status === 'CI_PASSED', `composant conforme -> CI_PASSED (${up.data.component?.status})`);
  assert(up.data.report?.ok === true && up.data.report.metrics.links_checked >= 10, 'rapport du linter joint');
  const again = await request('POST', '/v1/components', { manifest, glb_base64 }, teacher);
  assert(again.data.unchanged === true && again.data.component.status === 'CI_PASSED', 're-depot identique : inchange');

  const broken = clone(manifest); broken.id = `${COMP}_casse`;
  broken.electrical.links = broken.electrical.links.filter(([a]) => a !== 'bilame');
  const bad = await request('POST', '/v1/components', { manifest: broken, glb_base64 }, teacher);
  assert(bad.data.component?.status === 'DRAFT', 'composant defectueux -> DRAFT');
  assert(bad.data.report?.errors.some((e) => e.code === 'ERR_OPEN_CIRCUIT'), 'rapport : ERR_OPEN_CIRCUIT');

  console.log('\n--- Catalogue et acces avant approbation ---');
  let cat = await request('GET', '/v1/components/catalog');
  assert(cat.status === 200 && !cat.data.components.some((c) => c.component_id === COMP), 'catalogue : composant non approuve absent');
  assert((await request('GET', `/v1/components/${COMP}/model.glb`)).status === 404, 'modele non approuve : invisible sans compte');
  const model = await request('GET', `/v1/components/${COMP}/model.glb`, null, teacher);
  assert(model.status === 200 && Buffer.compare(model.data, GLB) === 0, 'modele servi au concepteur, identique au depot');

  console.log('\n--- Revue humaine ---');
  assert((await request('POST', `/v1/components/${COMP}_casse/submit`, {}, teacher)).status === 409, 'soumission d\'un DRAFT refusee (409)');
  assert((await request('POST', `/v1/components/${COMP}/approve`, { checklist: ALL }, admin)).status === 409, 'approbation sans soumission refusee (409)');
  const sub = await request('POST', `/v1/components/${COMP}/submit`, {}, teacher);
  assert(sub.data.component?.status === 'REVIEW_PENDING', 'soumission -> REVIEW_PENDING');
  assert((await request('POST', `/v1/components/${COMP}/approve`, { checklist: ALL }, teacher)).status === 403, 'approbation par un enseignant refusee (403)');
  const partial = await request('POST', `/v1/components/${COMP}/approve`, { checklist: { ...ALL, declenchement: false } }, admin);
  assert(partial.status === 400 && partial.data.missing?.[0] === 'declenchement', 'check-list incomplete refusee (point manquant indique)');
  const ok = await request('POST', `/v1/components/${COMP}/approve`, { checklist: ALL, comment: 'Revue TNI OK' }, admin);
  assert(ok.data.component?.status === 'APPROVED', 'check-list complete -> APPROVED');

  console.log('\n--- Catalogue apres approbation ---');
  cat = await request('GET', '/v1/components/catalog');
  const entry = cat.data.components.find((c) => c.component_id === COMP);
  assert(entry && cat.data.components.every((c) => c.component_id !== `${COMP}_casse`), 'catalogue : uniquement le composant APPROVED');
  assert((await request('GET', entry.model_url.replace('/api', ''))).status === 200, 'modele approuve : public');
  assert((await request('GET', entry.manifest_url.replace('/api', ''))).data.id === COMP, 'manifeste approuve : public');

  console.log('\n--- Modification d\'un composant approuve ---');
  const v2 = clone(manifest); v2.version = '1.2.1';
  const re = await request('POST', '/v1/components', { manifest: v2, glb_base64 }, teacher);
  assert(re.data.component?.status === 'CI_PASSED', 'nouvelle version -> repart en CI_PASSED');
  cat = await request('GET', '/v1/components/catalog');
  assert(!cat.data.components.some((c) => c.component_id === COMP), 'retire du catalogue jusqu\'a nouvelle revue');

  console.log('\n--- Rejet ---');
  await request('POST', `/v1/components/${COMP}/submit`, {}, teacher);
  assert((await request('POST', `/v1/components/${COMP}/reject`, { comment: 'non' }, admin)).status === 400, 'rejet sans rapport d\'anomalies refuse');
  const rej = await request('POST', `/v1/components/${COMP}/reject`, { comment: 'Bornes : fil hors de la cage en vue eclatee.' }, admin);
  assert(rej.data.component?.status === 'REJECTED', 'rejet avec rapport -> REJECTED');
  const detail = await request('GET', `/v1/components/${COMP}`, null, admin);
  const statuses = detail.data.history.map((h) => h.status).join(' > ');
  assert(statuses === 'CI_PASSED > REVIEW_PENDING > APPROVED > CI_PASSED > REVIEW_PENDING > REJECTED', `historique complet (${statuses})`);

  console.log(`\n=== Resultats : ${passed} passes, ${failed} echoues sur ${passed + failed} ===`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => { console.error('ERREUR FATALE', e); process.exit(1); });
