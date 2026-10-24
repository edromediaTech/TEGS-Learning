/**
 * Charge d'une salle sur un noeud TEGS-Edge (etape E7) : 20 eleves en meme temps.
 *
 * Lance un cloud (port 3200) et un noeud (port 3100, EDGE_MODE=1) comme
 * tests/integration/test-edge-node.js, cree une classe de N eleves, puis chaque eleve :
 * connexion par PIN (tous a la meme seconde), espace eleve, module, 10 traces xAPI.
 * Mesure les temps de reponse (mediane, p95, max) et la remontee de l'outbox au cloud.
 *
 * Usage : node tests/load/edge-classroom-load.js [nombre d'eleves, defaut 20]
 * Note : les temps dependent de la machine ; un Lenovo de salle est plus lent qu'un Mac M5.
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

const N = Number(process.argv[2]) || 20;
const TRACES_PER_STUDENT = 10;
const BACKEND = path.resolve(__dirname, '..', '..');
const MONGO_BASE = (process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning').replace(/\/[^/?]+(\?.*)?$/, '');
const CLOUD_DB = `${MONGO_BASE}/tegs_learning`;
const CLOUD_SECRET = process.env.JWT_SECRET || 'tegs_learning_dev_secret_change_in_production';
const EDGE_SECRET = crypto.randomBytes(16).toString('hex');
const CLOUD = 'http://127.0.0.1:3200/api';
const EDGE = 'http://127.0.0.1:3100/api';
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const tok = (u, secret) => jwt.sign({ id: String(u._id), role: u.role, tenant_id: String(u.tenant_id) }, secret, { expiresIn: '1h' });

async function api(base, method, p, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const t0 = performance.now();
  const res = await fetch(`${base}${p}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(120000) });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ms: performance.now() - t0 };
}

const healthy = (base) => fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) }).then((r) => r.ok).catch(() => false);
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await sleep(500); } return false; }

function stats(values) {
  const v = [...values].sort((a, b) => a - b);
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return { n: v.length, mediane: Math.round(q(0.5)), p95: Math.round(q(0.95)), max: Math.round(v[v.length - 1]) };
}

async function run() {
  console.log(`=== Charge d'une salle TEGS-Edge : ${N} eleves simultanes ===\n`);
  const uid = Date.now().toString(36).toUpperCase();
  const edgeDb = `${MONGO_BASE}/tegs_edge_load_${uid.toLowerCase()}`;
  const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'tegs-edge-load-'));
  const cloud = await mongoose.createConnection(CLOUD_DB).asPromise();
  const edgeConn = await mongoose.createConnection(edgeDb).asPromise();
  const C = (m) => cloud.model(m.modelName, m.schema);
  const E = (m) => edgeConn.model(m.modelName, m.schema);
  const procs = [];
  let tenantId = null;
  const start = (env) => {
    const p = spawn(process.execPath, ['src/server.js'], { cwd: BACKEND, env: { ...process.env, ...env }, stdio: 'ignore' });
    procs.push(p);
    return p;
  };

  try {
    const tenant = await C(Tenant).create({ name: `Charge ${uid}`, code: `CH-${uid}` });
    tenantId = tenant._id;
    const teacher = await C(User).create({ email: `prof-${uid.toLowerCase()}@load.test`, password: 'Load-Test-123!', firstName: 'Prof', lastName: 'Charge', role: 'teacher', tenant_id: tenant._id });
    const admin = await C(User).create({ email: `admin-${uid.toLowerCase()}@load.test`, password: 'Load-Test-123!', firstName: 'Admin', lastName: 'Charge', role: 'admin_ddene', tenant_id: tenant._id });
    const classroom = await C(CrnsClassroom).create({ course_id: 'x', name: 'Salle charge', code: `CL-${uid.slice(-4)}`, teacher_id: teacher._id, tenant_id: tenant._id, student_ids: [] });
    const course = await C(Module).create({
      title: `TP charge ${uid}`, tenant_id: tenant._id, created_by: teacher._id, status: 'published',
      sections: [{ title: 'S', order: 0, screens: [{ title: 'Quiz', order: 0, contentBlocks: [
        { type: 'quiz', order: 0, data: { question: 'Q ?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] } },
      ] }] }],
    });

    start({ PORT: '3200', MONGODB_URI: CLOUD_DB, JWT_SECRET: CLOUD_SECRET, EDGE_MODE: '' });
    if (!(await waitFor(() => healthy(CLOUD), 30000))) throw new Error('cloud de test injoignable');
    const students = Array.from({ length: N }, (_, i) => ({ first_name: `Eleve${String(i + 1).padStart(2, '0')}`, last_name: 'Charge' }));
    let r = await api(CLOUD, 'POST', `/crns-classrooms/${classroom._id}/students`, { students }, tok(teacher, CLOUD_SECRET));
    const creds = r.data.students;
    r = await api(CLOUD, 'POST', '/centers', { center_id: `LOAD-${uid}`, name: 'Salle charge', classroom_ids: [classroom._id], module_ids: [course._id], simulation_ids: ['aucune_simulation_v1'] }, tok(admin, CLOUD_SECRET));
    start({
      PORT: '3100', MONGODB_URI: edgeDb, JWT_SECRET: EDGE_SECRET, EDGE_MODE: '1',
      TEGS_CENTER_ID: `LOAD-${uid}`, TEGS_CLOUD_GATEWAY_URL: 'http://127.0.0.1:3200', TEGS_EDGE_API_KEY: r.data.token,
      SYNC_INTERVAL_SECONDS: '30', MODULES_STORAGE_PATH: storage,
    });
    if (!(await waitFor(async () => (await E(EdgeState).findById('state'))?.last_pull_ok_at, 120000))) throw new Error('premiere synchro du noeud');
    console.log(`Noeud synchronise : ${await E(User).countDocuments({ role: 'student', isActive: true })} eleves recus.\n`);

    // --- Toute la classe se connecte a la meme seconde ---
    const t0 = performance.now();
    const logins = await Promise.all(creds.map((c) => api(EDGE, 'POST', '/auth/login-pin', { tenant_id: String(tenant._id), matricule: c.matricule, pin: c.pin })));
    const loginWall = performance.now() - t0;
    const failedLogins = logins.filter((x) => x.status !== 200).length;

    // --- Puis chacun : espace eleve, module, 10 traces ---
    const pages = [];
    const traces = [];
    let errors = 0;
    await Promise.all(logins.map(async (l) => {
      if (l.status !== 200) return;
      const t = l.data.token;
      const home = await api(EDGE, 'GET', '/student/home', null, t);
      pages.push(home.ms);
      const m = home.data?.modules?.[0];
      const json = await api(EDGE, 'GET', `/share/public/${m?.share_token}/json`, null, t);
      pages.push(json.ms);
      if (home.status !== 200 || json.status !== 200) errors += 1;
      for (let i = 0; i < TRACES_PER_STUDENT; i++) {
        const x = await api(EDGE, 'POST', '/xapi/statements', {
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered', display: { 'fr-FR': 'answered' } },
          object: { id: `https://tegs-learning.edu.ht/courses/${course._id}`, definition: { name: { 'fr-FR': 'TP charge' } } },
          result: { success: i % 2 === 0 },
        }, t);
        traces.push(x.ms);
        if (x.status !== 201) errors += 1;
      }
    }));

    const ls = stats(logins.map((x) => x.ms));
    const ps = stats(pages);
    const ts = stats(traces);
    console.log(`Connexions PIN simultanees : ${N - failedLogins}/${N} reussies en ${Math.round(loginWall)} ms au total`);
    console.log(`  par eleve : mediane ${ls.mediane} ms, p95 ${ls.p95} ms, max ${ls.max} ms`);
    console.log(`Espace eleve + module    : mediane ${ps.mediane} ms, p95 ${ps.p95} ms, max ${ps.max} ms (${ps.n} requetes)`);
    console.log(`Traces xAPI              : mediane ${ts.mediane} ms, p95 ${ts.p95} ms, max ${ts.max} ms (${ts.n} traces)`);
    console.log(`Erreurs                  : ${errors + failedLogins}`);

    // --- Remontee au cloud ---
    const pending = await E(Statement).countDocuments({ 'edge_sync.status': 'PENDING' });
    const tPush = Date.now();
    const teacherTok = tok({ _id: teacher._id, role: 'teacher', tenant_id: tenant._id }, EDGE_SECRET);
    await fetch(`${EDGE}/edge/sync-now`, { method: 'POST', headers: { Authorization: `Bearer ${teacherTok}` } }).catch(() => {});
    const synced = await waitFor(async () => (await E(Statement).countDocuments({ 'edge_sync.status': 'SYNCED' })) >= pending, 120000);
    const inCloud = await C(Statement).countDocuments({ tenant_id: tenant._id });
    console.log(`Outbox                   : ${pending} traces en attente -> ${synced ? `remontees en ${Math.round((Date.now() - tPush) / 1000)} s` : 'NON remontees'} (${inCloud} dans le cloud)`);
    process.exitCode = failedLogins || errors || !synced ? 1 : 0;
  } finally {
    procs.forEach((p) => p.kill('SIGTERM'));
    await sleep(500);
    if (tenantId) {
      await C(Statement).deleteMany({ tenant_id: tenantId });
      await C(Center).deleteMany({ tenant_id: tenantId });
      await C(CrnsClassroom).deleteMany({ tenant_id: tenantId });
      await C(Module).deleteMany({ tenant_id: tenantId });
      await C(User).deleteMany({ tenant_id: tenantId });
      await C(Tenant).deleteOne({ _id: tenantId });
    }
    await edgeConn.dropDatabase();
    await cloud.close();
    await edgeConn.close();
    fs.rmSync(storage, { recursive: true, force: true });
  }
}

run().catch((err) => { console.error('Erreur fatale:', err); process.exit(1); });
