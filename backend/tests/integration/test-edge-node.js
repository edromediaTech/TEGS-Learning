/**
 * TEGS-Learning - Test de bout en bout d'un noeud TEGS-Edge (etape E5)
 *
 * Lance un "cloud" (port 3200, base du cloud local) et un noeud edge (port 3100,
 * EDGE_MODE=1, base et stockage propres), puis verifie :
 *  - synchro initiale : etablissement, classe, eleves (matricule + PIN), module de cours,
 *    simulation (paquet verifie et extrait, manifeste local) ;
 *  - connexion eleve par PIN sur le noeud, traces xAPI en outbox ;
 *  - coupure du cloud : la salle continue (connexion, traces), echec de synchro sans perte ;
 *  - retour du cloud : outbox remontee, traces presentes dans le cloud ;
 *  - eleve retire de sa classe -> desactive sur le noeud ;
 *  - E6 : medias des modules copies sur le noeud, module publie non partage ouvert par un
 *    eleve connecte, enseignant connecte avec son mot de passe du cloud, rapport d'integrite.
 *
 * Pre-requis : MongoDB local, manifeste CRNS v2 accessible (GCS) pour la simulation.
 * Usage : node tests/integration/test-edge-node.js
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

const BACKEND = path.resolve(__dirname, '..', '..');
const MONGO_BASE = (process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning').replace(/\/[^/?]+(\?.*)?$/, '');
const CLOUD_DB = `${MONGO_BASE}/${(process.env.MONGODB_URI || '').split('/').pop()?.split('?')[0] || 'tegs_learning'}`;
const CLOUD_SECRET = process.env.JWT_SECRET || 'tegs_learning_dev_secret_change_in_production';
const EDGE_SECRET = crypto.randomBytes(16).toString('hex');
const CLOUD = 'http://127.0.0.1:3200/api';
const EDGE = 'http://127.0.0.1:3100/api';
const SIM_ID = 'tension_electrique_v1';

let passed = 0;
let failed = 0;
function assert(c, name) { if (c) { console.log(`  [PASS] ${name}`); passed++; } else { console.log(`  [FAIL] ${name}`); failed++; } }
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const tok = (user, secret) => jwt.sign({ id: String(user._id), role: user.role, tenant_id: String(user.tenant_id) }, secret, { expiresIn: '1h' });

async function api(base, method, p, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${p}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  return { status: res.status, data: await res.json().catch(() => null) };
}

function startServer(name, env, logFile) {
  const out = fs.openSync(logFile, 'w');
  const child = spawn(process.execPath, ['src/server.js'], { cwd: BACKEND, env: { ...process.env, ...env }, stdio: ['ignore', out, out] });
  child.label = name;
  return child;
}

async function waitFor(fn, timeoutMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await fn()) return true; } catch { /* pas encore */ }
    await sleep(1000);
  }
  console.log(`  (attente depassee : ${label})`);
  return false;
}

const healthy = (base) => fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) }).then((r) => r.ok);

async function run() {
  console.log('=== TEGS-Learning | Noeud TEGS-Edge de bout en bout (E5) ===\n');
  const uid = Date.now().toString(36).toUpperCase();
  const edgeDb = `${MONGO_BASE}/tegs_edge_test_${uid.toLowerCase()}`;
  const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'tegs-edge-'));
  const logs = fs.mkdtempSync(path.join(os.tmpdir(), 'tegs-edge-logs-'));
  const procs = {};
  const cloud = await mongoose.createConnection(CLOUD_DB).asPromise();
  const edgeConn = await mongoose.createConnection(edgeDb).asPromise();
  const C = (m) => cloud.model(m.modelName, m.schema);
  const E = (m) => edgeConn.model(m.modelName, m.schema);
  const created = { tenant: null };

  const cloudEnv = { PORT: '3200', MONGODB_URI: CLOUD_DB, JWT_SECRET: CLOUD_SECRET, EDGE_MODE: '' };
  const startCloud = async () => {
    procs.cloud = startServer('cloud', cloudEnv, path.join(logs, 'cloud.log'));
    return waitFor(() => healthy(CLOUD), 30000, 'cloud');
  };
  const stopCloud = async () => { procs.cloud?.kill('SIGTERM'); await waitFor(async () => !(await healthy(CLOUD).catch(() => false)), 10000, 'arret cloud'); };

  try {
    // --- Donnees du cloud ---
    const tenant = await C(Tenant).create({ name: `Lycee Edge ${uid}`, code: `LE-${uid}` });
    created.tenant = tenant._id;
    const teacher = await C(User).create({ email: `prof-${uid.toLowerCase()}@edge.test`, password: 'Edge-Test-123!', firstName: 'Prof', lastName: 'Edge', role: 'teacher', tenant_id: tenant._id });
    const admin = await C(User).create({ email: `admin-${uid.toLowerCase()}@edge.test`, password: 'Edge-Test-123!', firstName: 'Admin', lastName: 'Edge', role: 'admin_ddene', tenant_id: tenant._id });
    const classroom = await C(CrnsClassroom).create({ course_id: SIM_ID, name: '9e Edge', code: `CL-${uid.slice(-4)}`, teacher_id: teacher._id, tenant_id: tenant._id, student_ids: [] });
    // Image servie par le cloud de test : doit etre copiee sur le noeud (E6).
    const mediaName = `edge-test-${uid.toLowerCase()}.png`;
    const mediaPath = path.join(BACKEND, 'public', 'uploads', mediaName);
    fs.writeFileSync(mediaPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
    created.media = mediaPath;
    const mediaUrl = `http://127.0.0.1:3200/public/uploads/${mediaName}`;
    const course = await C(Module).create({
      title: `TP tension ${uid}`, tenant_id: tenant._id, created_by: teacher._id, status: 'published',
      shareEnabled: true, shareToken: `edge${uid.toLowerCase()}tok`,
      sections: [{ title: 'Chapitre 1', order: 0, screens: [{ title: 'Quiz', order: 0, contentBlocks: [
        { type: 'quiz', order: 0, data: { question: 'Unite de la tension ?', options: [{ text: 'Volt', isCorrect: true }, { text: 'Ampere', isCorrect: false }] } },
        { type: 'text', order: 1, data: { content: `<p>Schema : <img src="${mediaUrl}"></p>` } },
      ] }] }],
    });
    // Module publie mais jamais partage : un eleve connecte doit pouvoir l'ouvrir (E6).
    const course2 = await C(Module).create({
      title: `Cours non partage ${uid}`, tenant_id: tenant._id, created_by: teacher._id, status: 'published',
      sections: [{ title: 'S', order: 0, screens: [{ title: 'E', order: 0, contentBlocks: [] }] }],
    });

    if (!(await startCloud())) throw new Error('le cloud de test ne demarre pas');
    let r = await api(CLOUD, 'POST', `/crns-classrooms/${classroom._id}/students`, { students: [{ first_name: 'Ana', last_name: 'Edge' }, { first_name: 'Bel', last_name: 'Edge' }] }, tok(teacher, CLOUD_SECRET));
    const [ana, bel] = r.data.students;
    r = await api(CLOUD, 'POST', '/centers', { center_id: `TEST-NODE-${uid}`, name: 'Salle test', classroom_ids: [classroom._id], simulation_ids: [SIM_ID], module_ids: [course._id, course2._id] }, tok(admin, CLOUD_SECRET));
    const nodeToken = r.data.token;
    assert(r.status === 201 && nodeToken, 'Cloud : centre cree, jeton du noeud');

    // --- Demarrage du noeud ---
    console.log('\n--- Synchro initiale ---');
    procs.edge = startServer('edge', {
      PORT: '3100', MONGODB_URI: edgeDb, JWT_SECRET: EDGE_SECRET, EDGE_MODE: '1',
      TEGS_CENTER_ID: `TEST-NODE-${uid}`, TEGS_CLOUD_GATEWAY_URL: 'http://127.0.0.1:3200', TEGS_EDGE_API_KEY: nodeToken,
      SYNC_INTERVAL_SECONDS: '30', MODULES_STORAGE_PATH: storage,
    }, path.join(logs, 'edge.log'));
    assert(await waitFor(() => healthy(EDGE), 30000, 'noeud'), 'Noeud demarre (EDGE_MODE)');
    const synced = await waitFor(async () => (await E(EdgeState()).findById('state'))?.last_pull_ok_at, 240000, 'premiere synchro');
    assert(synced, 'Premiere synchro reussie');

    const lt = await E(Tenant).findById(tenant._id).lean();
    const ls = await E(User).find({ tenant_id: tenant._id, role: 'student' }).select('+pin_hash').lean();
    const lc = await E(CrnsClassroom).findById(classroom._id).lean();
    const lm = await E(Module).findById(course._id).lean();
    assert(lt?.name === tenant.name, 'Etablissement recopie (meme _id)');
    assert(ls.length === 2 && ls.every((s) => s.matricule && s.pin_hash?.startsWith('$2') && s.isActive), 'Eleves recopies avec matricule et empreinte du PIN');
    assert(lc?.student_ids?.length === 2, 'Classe recopiee avec ses eleves');
    assert(lm && lm.sections[0]._id instanceof mongoose.Types.ObjectId && lm.sections[0].screens[0]._id instanceof mongoose.Types.ObjectId, 'Module de cours recopie, identifiants internes en ObjectId');
    const manifest = JSON.parse(fs.readFileSync(path.join(storage, 'simulations', 'manifest.json'), 'utf8'));
    assert(manifest.count === 1 && manifest.simulations[0].simulation_id === SIM_ID, 'Manifeste local : 1 simulation');
    assert(fs.existsSync(path.join(storage, 'packages', SIM_ID, 'launch.html')) && fs.existsSync(path.join(storage, 'simulations', manifest.simulations[0].asset_url.split('/').pop())), 'Paquet extrait et GLB servi');

    const textBlock = lm.sections[0].screens[0].contentBlocks.find((b) => b.type === 'text');
    const localSrc = textBlock?.data?.content?.match(/src="([^"]+)"/)?.[1] || '';
    assert(localSrc.startsWith('/media/') && fs.existsSync(path.join(storage, localSrc)), 'Media du module copie sur le noeud, URL reecrite en /media/');

    // --- La salle, en ligne ---
    console.log('\n--- Activite en salle ---');
    r = await api(EDGE, 'POST', '/auth/login-pin', { tenant_id: String(tenant._id), matricule: ana.matricule, pin: ana.pin });
    assert(r.status === 200 && r.data.token, "Connexion de l'eleve par PIN sur le noeud");
    const anaTok = r.data.token;
    r = await api(EDGE, 'GET', `/share/public/${course.shareToken}/json`);
    assert(r.status === 200, 'Module de cours servi par le noeud');
    r = await api(EDGE, 'GET', '/student/home', null, anaTok);
    const home2 = r.data?.modules?.find((m) => String(m.id) === String(course2._id));
    assert(r.status === 200 && home2?.share_token, "Espace eleve : le module non partage est liste");
    r = await api(EDGE, 'GET', `/share/public/${home2?.share_token}/json`, null, anaTok);
    assert(r.status === 200, 'Module non partage ouvert par l\'eleve connecte');
    r = await api(EDGE, 'GET', `/share/public/${home2?.share_token}/json`);
    assert(r.status === 404, 'Module non partage refuse sans connexion');
    r = await api(EDGE, 'POST', '/auth/login', { email: teacher.email, password: 'Edge-Test-123!', tenant_id: String(tenant._id) });
    assert(r.status === 200 && r.data?.token, "Enseignant connecte sur le noeud avec son mot de passe du cloud");
    const xapi = (verb) => api(EDGE, 'POST', '/xapi/statements', {
      verb: { id: `http://adlnet.gov/expapi/verbs/${verb}`, display: { 'fr-FR': verb } },
      object: { id: `https://tegs-learning.edu.ht/courses/${course._id}`, definition: { name: { 'fr-FR': 'TP tension' } } },
      result: { success: true, score: { raw: 1, max: 1 } },
    }, anaTok);
    r = await api(EDGE, 'POST', '/xapi/statements', {
      verb: { id: 'http://adlnet.gov/expapi/verbs/passed', display: { 'fr-FR': 'passed' } },
      object: { id: `https://tegs-learning.edu.ht/courses/${course._id}`, definition: { name: { 'fr-FR': 'TP tension' } } },
      result: { success: true, score: { raw: 1, max: 1 } },
      context: { extensions: { integrity: { version: 1, level: 'suspect', duration_ms: 600000, focus_loss_count: 4, focus_lost_ms: 45000, tab_hidden_count: 3, hidden_ms: 42000, fullscreen_exit_count: 1, copy_count: 0, paste_count: 2, events: [] } } },
    }, anaTok);
    assert(r.status === 201, 'Trace xAPI (avec resume d\'integrite) enregistree sur le noeud');
    const pending = await E(Statement).countDocuments({ 'edge_sync.status': 'PENDING' });
    assert(pending === 1, 'Trace en outbox (PENDING)');

    // --- Coupure du cloud ---
    console.log('\n--- Coupure du cloud ---');
    await stopCloud();
    r = await api(EDGE, 'POST', '/auth/login-pin', { tenant_id: String(tenant._id), matricule: bel.matricule, pin: bel.pin });
    assert(r.status === 200, 'Cloud coupe : un autre eleve se connecte quand meme');
    r = await xapi('completed');
    assert(r.status === 201, 'Cloud coupe : la trace est acceptee localement');
    const teacherEdgeTok = tok({ _id: teacher._id, role: 'teacher', tenant_id: tenant._id }, EDGE_SECRET);
    await api(EDGE, 'POST', '/edge/sync-now', null, teacherEdgeTok);
    assert(await waitFor(async () => (await api(EDGE, 'GET', '/edge/status', null, teacherEdgeTok)).data?.sync?.consecutive_failures >= 1, 30000, 'echec de synchro'), "Synchro en echec signalee (repli exponentiel)");
    r = await api(EDGE, 'GET', '/edge/status', null, teacherEdgeTok);
    assert(r.data?.outbox?.pending === 2 && r.data?.sync?.last_error, `Outbox conservee : 2 traces en attente, erreur visible`);

    // --- Retour du cloud ---
    console.log('\n--- Retour du cloud ---');
    await startCloud();
    await api(EDGE, 'POST', '/edge/sync-now', null, teacherEdgeTok);
    assert(await waitFor(async () => (await api(EDGE, 'GET', '/edge/status', null, teacherEdgeTok)).data?.outbox?.synced === 2, 60000, 'remontee'), 'Outbox remontee : 2 traces SYNCED');
    const inCloud = await C(Statement).find({ tenant_id: tenant._id, 'context.extensions.edge.center_id': `TEST-NODE-${uid}` }).lean();
    assert(inCloud.length === 2 && inCloud.every((s) => String(s.actor.user_id) === String(ana.id)), 'Traces presentes dans le cloud, attribuees au bon eleve');
    r = await api(EDGE, 'GET', '/edge/status', null, teacherEdgeTok);
    assert(r.data?.sync?.consecutive_failures === 0 && r.data?.sync?.clock_offset_ms !== null, 'Etat du noeud revenu a la normale');
    r = await api(CLOUD, 'GET', `/crns-classrooms/${classroom._id}/integrity`, null, tok(teacher, CLOUD_SECRET));
    const row = r.data?.rows?.find((x) => String(x.student_id) === String(ana.id));
    assert(r.status === 200 && row?.level === 'suspect' && row.focus_loss_count === 4 && row.center_id === `TEST-NODE-${uid}`, "Rapport d'integrite du cloud : copie faite sur le noeud, signalee suspecte");

    // --- Evolution du roster ---
    console.log('\n--- Roster ---');
    await C(CrnsClassroom).updateOne({ _id: classroom._id }, { $pull: { student_ids: new mongoose.Types.ObjectId(bel.id) } });
    await api(EDGE, 'POST', '/edge/sync-now', null, teacherEdgeTok);
    assert(await waitFor(async () => (await E(User).findById(bel.id).lean())?.isActive === false, 30000, 'desactivation'), 'Eleve retire de la classe : desactive sur le noeud (pas supprime)');
    r = await api(EDGE, 'POST', '/auth/login-pin', { tenant_id: String(tenant._id), matricule: bel.matricule, pin: bel.pin });
    assert(r.status === 401, 'Eleve desactive : connexion refusee sur le noeud');
    r = await api(EDGE, 'POST', `/crns-classrooms/${classroom._id}/students`, { students: [{ first_name: 'X', last_name: 'Y' }] }, teacherEdgeTok);
    assert(r.status === 409, 'Noeud : creation d\'eleves renvoyee vers le cloud (409)');
  } finally {
    procs.edge?.kill('SIGTERM');
    procs.cloud?.kill('SIGTERM');
    await sleep(500);
    if (created.tenant) {
      await C(Statement).deleteMany({ tenant_id: created.tenant });
      await C(Center).deleteMany({ tenant_id: created.tenant });
      await C(CrnsClassroom).deleteMany({ tenant_id: created.tenant });
      await C(Module).deleteMany({ tenant_id: created.tenant });
      await C(User).deleteMany({ tenant_id: created.tenant });
      await C(Tenant).deleteOne({ _id: created.tenant });
    }
    await edgeConn.dropDatabase();
    await cloud.close();
    await edgeConn.close();
    fs.rmSync(storage, { recursive: true, force: true });
    if (created.media) fs.rmSync(created.media, { force: true });
    console.log(`  (journaux du test : ${logs})`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  RESULTATS : ${passed} passes / ${passed + failed} total`);
  console.log(failed > 0 ? `  ${failed} ECHEC(S)` : '  TOUS LES TESTS PASSENT');
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

function EdgeState() { return require('../../src/models/EdgeState'); }

run().catch((err) => { console.error('Erreur fatale:', err); process.exit(1); });
