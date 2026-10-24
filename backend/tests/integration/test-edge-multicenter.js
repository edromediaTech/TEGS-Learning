/**
 * TEGS-Learning - Duplication sur plusieurs centres (etape E7)
 *
 * Un cloud (port 3200), deux noeuds (3101, 3102) issus de la meme image, qui ne
 * different que par leur configuration (centre, jeton) - exigence du CDC :
 * duplication par simple injection de variables d'environnement.
 * Verifie : chaque noeud ne recoit que les classes de son centre ; un eleve d'une salle
 * ne se connecte pas dans l'autre ; les traces arrivent au cloud marquees de leur centre.
 *
 * Usage : node tests/integration/test-edge-multicenter.js
 */
require('dotenv').config();
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Tenant = require('../../src/models/Tenant');
const User = require('../../src/models/User');
const Module = require('../../src/models/Module');
const CrnsClassroom = require('../../src/models/CrnsClassroom');
const Center = require('../../src/models/Center');
const Statement = require('../../src/models/Statement');
const EdgeState = require('../../src/models/EdgeState');

const BACKEND = path.resolve(__dirname, '..', '..');
const MONGO_BASE = (process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning').replace(/\/[^/?]+(\?.*)?$/, '');
const CLOUD_DB = `${MONGO_BASE}/tegs_learning`;
const CLOUD_SECRET = process.env.JWT_SECRET || 'tegs_learning_dev_secret_change_in_production';
const CLOUD = 'http://127.0.0.1:3200/api';

let passed = 0;
let failed = 0;
function assert(c, name) { if (c) { console.log(`  [PASS] ${name}`); passed++; } else { console.log(`  [FAIL] ${name}`); failed++; } }
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const tok = (u, secret) => jwt.sign({ id: String(u._id), role: u.role, tenant_id: String(u.tenant_id) }, secret, { expiresIn: '1h' });
async function api(base, method, p, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${p}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  return { status: res.status, data: await res.json().catch(() => null) };
}
const healthy = (base) => fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) }).then((r) => r.ok).catch(() => false);
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await sleep(1000); } return false; }

async function run() {
  console.log('=== TEGS-Learning | Duplication sur deux centres (E7) ===\n');
  const uid = Date.now().toString(36).toUpperCase();
  const cloud = await mongoose.createConnection(CLOUD_DB).asPromise();
  const C = (m) => cloud.model(m.modelName, m.schema);
  const procs = [];
  const nodes = [];
  let tenantId = null;
  const start = (env) => { const p = spawn(process.execPath, ['src/server.js'], { cwd: BACKEND, env: { ...process.env, ...env }, stdio: 'ignore' }); procs.push(p); return p; };

  try {
    const tenant = await C(Tenant).create({ name: `Multi ${uid}`, code: `MU-${uid}` });
    tenantId = tenant._id;
    const admin = await C(User).create({ email: `admin-${uid.toLowerCase()}@multi.test`, password: 'Multi-Test-123!', firstName: 'Admin', lastName: 'Multi', role: 'admin_ddene', tenant_id: tenant._id });
    const teacher = await C(User).create({ email: `prof-${uid.toLowerCase()}@multi.test`, password: 'Multi-Test-123!', firstName: 'Prof', lastName: 'Multi', role: 'teacher', tenant_id: tenant._id });
    const course = await C(Module).create({ title: `TP ${uid}`, tenant_id: tenant._id, created_by: teacher._id, status: 'published', sections: [] });
    start({ PORT: '3200', MONGODB_URI: CLOUD_DB, JWT_SECRET: CLOUD_SECRET, EDGE_MODE: '' });
    if (!(await waitFor(() => healthy(CLOUD), 30000))) throw new Error('cloud de test injoignable');

    // Deux salles : meme etablissement, classes differentes, meme image, configs differentes.
    for (const [i, port] of [[1, 3101], [2, 3102]]) {
      const cls = await C(CrnsClassroom).create({ course_id: 'x', name: `Salle ${i}`, code: `CL-${i}${uid.slice(-3)}`, teacher_id: teacher._id, tenant_id: tenant._id, student_ids: [] });
      let r = await api(CLOUD, 'POST', `/crns-classrooms/${cls._id}/students`, { students: [{ first_name: `Eleve${i}`, last_name: 'Multi' }] }, tok(teacher, CLOUD_SECRET));
      const student = r.data.students[0];
      const centerId = `MULTI-${uid}-${i}`;
      r = await api(CLOUD, 'POST', '/centers', { center_id: centerId, name: `Salle ${i}`, classroom_ids: [cls._id], module_ids: [course._id], simulation_ids: ['aucune_simulation_v1'] }, tok(admin, CLOUD_SECRET));
      const secret = crypto.randomBytes(16).toString('hex');
      const db = `${MONGO_BASE}/tegs_edge_multi_${uid.toLowerCase()}_${i}`;
      const storage = fs.mkdtempSync(path.join(os.tmpdir(), `tegs-edge-multi-${i}-`));
      start({
        PORT: String(port), MONGODB_URI: db, JWT_SECRET: secret, EDGE_MODE: '1', TEGS_CENTER_ID: centerId,
        TEGS_CLOUD_GATEWAY_URL: 'http://127.0.0.1:3200', TEGS_EDGE_API_KEY: r.data.token, SYNC_INTERVAL_SECONDS: '30', MODULES_STORAGE_PATH: storage,
      });
      nodes.push({ i, base: `http://127.0.0.1:${port}/api`, centerId, student, cls, secret, storage, conn: await mongoose.createConnection(db).asPromise() });
    }
    for (const n of nodes) {
      const E = (m) => n.conn.model(m.modelName, m.schema);
      assert(await waitFor(async () => (await E(EdgeState).findById('state'))?.last_pull_ok_at, 120000), `Noeud ${n.i} : premiere synchro`);
    }

    console.log('\n--- Isolation des salles ---');
    for (const n of nodes) {
      const E = (m) => n.conn.model(m.modelName, m.schema);
      const other = nodes.find((x) => x !== n);
      const local = await E(User).find({ role: 'student', isActive: true }).lean();
      assert(local.length === 1 && String(local[0]._id) === String(n.student.id), `Noeud ${n.i} : uniquement l'eleve de sa salle`);
      assert((await E(CrnsClassroom).countDocuments({ archived_at: null })) === 1, `Noeud ${n.i} : uniquement sa classe`);
      let r = await api(n.base, 'POST', '/auth/login-pin', { tenant_id: String(tenantId), matricule: n.student.matricule, pin: n.student.pin });
      assert(r.status === 200, `Noeud ${n.i} : son eleve se connecte`);
      const t = r.data?.token;
      r = await api(n.base, 'POST', '/auth/login-pin', { tenant_id: String(tenantId), matricule: other.student.matricule, pin: other.student.pin });
      assert(r.status === 401, `Noeud ${n.i} : l'eleve de l'autre salle est refuse`);
      r = await api(n.base, 'POST', '/xapi/statements', {
        verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'fr-FR': 'completed' } },
        object: { id: `https://tegs-learning.edu.ht/courses/${course._id}` },
      }, t);
      await api(n.base, 'POST', '/edge/sync-now', null, tok({ _id: teacher._id, role: 'teacher', tenant_id: tenantId }, n.secret));
    }

    console.log('\n--- Remontee au cloud ---');
    for (const n of nodes) {
      const ok = await waitFor(async () => (await C(Statement).countDocuments({ tenant_id: tenantId, 'context.extensions.edge.center_id': n.centerId })) === 1, 60000);
      const st = await C(Statement).findOne({ tenant_id: tenantId, 'context.extensions.edge.center_id': n.centerId }).lean();
      assert(ok && String(st?.actor?.user_id) === String(n.student.id), `Centre ${n.i} : sa trace est au cloud, marquee ${n.centerId}`);
    }
    const centers = await C(Center).find({ tenant_id: tenantId }).lean();
    assert(centers.length === 2 && centers.every((c) => c.last_push_at && c.edge_version), 'Cloud : les deux centres ont remonte leur etat');
  } finally {
    procs.forEach((p) => p.kill('SIGTERM'));
    await sleep(500);
    for (const n of nodes) { await n.conn.dropDatabase().catch(() => {}); await n.conn.close(); fs.rmSync(n.storage, { recursive: true, force: true }); }
    if (tenantId) {
      for (const m of [Statement, Center, CrnsClassroom, Module, User]) await C(m).deleteMany({ tenant_id: tenantId });
      await C(Tenant).deleteOne({ _id: tenantId });
    }
    await cloud.close();
  }
  console.log(`\n${'='.repeat(60)}\n  RESULTATS : ${passed} passes / ${passed + failed} total\n${failed ? `  ${failed} ECHEC(S)` : '  TOUS LES TESTS PASSENT'}\n${'='.repeat(60)}`);
  process.exit(failed ? 1 : 0);
}

run().catch((err) => { console.error('Erreur fatale:', err); process.exit(1); });
