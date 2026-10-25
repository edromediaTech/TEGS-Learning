/**
 * Linter 3D des composants CRNS (verrou QA n°1) : analyse un paquet component.glb +
 * component.json (format crns-component/1) et rend un rapport. Aucune erreur = le composant
 * peut passer en CI_PASSED ; sinon il reste en DRAFT avec le rapport.
 *
 * Utilise par le serveur au depot d'un composant (routes/components.js) et en ligne de commande
 * (scripts/qa/validate-component.js : CI, forge CRNS).
 */
const crypto = require('crypto');
const { inspectGlb, axisAngleQuat } = require('./gltfInspect');
const { checkElectrical } = require('./checks/electrical');
const { checkKinematics } = require('./checks/kinematics');
const { checkPerformance } = require('./checks/performance');

const LINTER_VERSION = '1.0.0';
const SCHEMA = 'crns-component/1';

function checkSchema(manifest, report) {
  const err = (message, details = {}) => report.errors.push({ code: 'ERR_SCHEMA', message, details });
  if (!manifest || typeof manifest !== 'object') { err('manifeste absent ou illisible'); return false; }
  if (manifest.schema !== SCHEMA) err(`schema « ${manifest.schema} » : ${SCHEMA} attendu`);
  if (!/^[a-z0-9_]+$/.test(manifest.id || '')) err('id : minuscules, chiffres et _ uniquement');
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version || '')) err('version : format x.y.z attendu');
  for (const key of ['electrical', 'kinematics']) if (!manifest[key]) err(`section « ${key} » manquante`);
  const el = manifest.electrical || {};
  for (const key of ['conductors', 'links', 'path']) if (!el[key]) err(`electrical.${key} manquant`);
  for (const t of ['borne_amont', 'borne_aval']) if (!el.conductors?.[t]) err(`electrical.conductors.${t} manquant`);
  return report.errors.length === 0;
}

/**
 * @param {{ manifest: object, glb: Buffer, budget?: object }} input
 * @returns rapport { component, version, ok, errors[], warnings[], metrics, linter_version, checked_at }
 */
function validateComponent({ manifest, glb: glbBuffer, budget }) {
  const report = {
    component: manifest?.id ?? null,
    version: manifest?.version ?? null,
    ok: false,
    errors: [],
    warnings: [],
    metrics: {},
    linter_version: LINTER_VERSION,
    checked_at: new Date().toISOString(),
  };
  if (!checkSchema(manifest, report)) return report;

  const sha = crypto.createHash('sha256').update(glbBuffer).digest('hex');
  report.metrics.model_sha256 = sha;
  if (manifest.model?.sha256 && manifest.model.sha256 !== sha) {
    report.errors.push({ code: 'ERR_MODEL_HASH', message: 'le GLB ne correspond pas a l\'empreinte du manifeste', details: { expected: manifest.model.sha256, actual: sha } });
  }

  let glb;
  try {
    glb = inspectGlb(glbBuffer);
  } catch (e) {
    report.errors.push({ code: 'ERR_MODEL', message: `GLB illisible : ${e.message}`, details: {} });
    return report;
  }

  // Etats d'actionneurs -> transformations imposees aux noeuds (le reste a l'etat initial).
  const actuators = new Map((manifest.kinematics?.actuators || []).map((a) => [a.id, a]));
  const stateOverrides = (states) => {
    const out = {};
    for (const a of actuators.values()) {
      const state = states[a.id] ?? a.initial;
      const value = a.states?.[state];
      if (value === undefined || !glb.names.has(a.node)) continue;
      if (a.type === 'rotation') out[a.node] = { rotation: axisAngleQuat(a.axis, value) };
      else if (a.type === 'translation') {
        const v = { x: [value, 0, 0], y: [0, value, 0], z: [0, 0, value] }[a.axis];
        if (v) out[a.node] = { translationDelta: v };
      }
    }
    return out;
  };

  const ctx = { report, stateOverrides, budget };
  checkElectrical(manifest, glb, ctx);
  checkKinematics(manifest, glb, ctx);
  checkPerformance(manifest, glb, ctx);
  report.ok = report.errors.length === 0;
  return report;
}

module.exports = { validateComponent, LINTER_VERSION, SCHEMA };
