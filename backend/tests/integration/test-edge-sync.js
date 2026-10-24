/**
 * TEGS-Learning - Tests API TEGS-Edge (etape E3)
 *
 * Centres : creation (jeton montre une fois), droits, unicite, classes d'un autre etablissement.
 * Pull    : authentification du noeud, roster des classes du centre, delta, paquets a jour.
 * Push    : signature HMAC, ACK, idempotence, horodatage corrige, rejets granulaires.
 * Rotation du jeton et desactivation du centre.
 *
 * Pre-requis : MongoDB, backend sur localhost:3000, manifeste CRNS v2 accessible
 * (CRNS_MANIFEST_URL du backend, GCS par defaut).
 * Usage : node tests/integration/test-edge-sync.js
 */

require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { fetch: undiciFetch } = require('undici');

const Tenant = require('../../src/models/Tenant');
const User = require('../../src/models/User');
const Module = require('../../src/models/Module');
const CrnsClassroom = require('../../src/models/CrnsClassroom');
const Center = require('../../src/models/Center');
const Statement = require('../../src/models/Statement');

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}/api`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning';
const JWT_SECRET = process.env.JWT_SECRET || 'tegs_learning_dev_secret_change_in_production';

let passed = 0;
let failed = 0;
function assert(condition, testName) {
  if (condition) { console.log(`  [PASS] ${testName}`); passed++; } else { console.log(`  [FAIL] ${testName}`); failed++; }
}

function userToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role, tenant_id: user.tenant_id?.toString() }, JWT_SECRET, { expiresIn: '1h' });
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await undiciFetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
}

// Appel d'un noeud edge ; sign=true ajoute X-Edge-Signature (HMAC, cle = sha256(jeton) en hex).
async function edge(path, body, { centerId, token, sign = false, signature } = {}) {
  const raw = JSON.stringify(body);
  const headers = { 'Content-Type': 'application/json' };
  if (centerId) headers['X-Center-ID'] = centerId;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (signature) headers['X-Edge-Signature'] = signature;
  else if (sign) {
    const key = crypto.createHash('sha256').update(token).digest('hex');
    headers['X-Edge-Signature'] = 'sha256=' + crypto.createHmac('sha256', key).update(raw).digest('hex');
  }
  const res = await undiciFetch(`${BASE_URL}/v1/edge/sync${path}`, { method: 'POST', headers, body: raw });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function runTests() {
  console.log('=== TEGS-Learning | Tests API TEGS-Edge (E3) ===\n');
  await mongoose.connect(MONGODB_URI);
  const uid = Date.now().toString(36).toUpperCase();
  const centerId = `TEST-EDGE-${uid}`;
  const created = { tenants: [], users: [] };

  try {
    // --- Setup ---
    const tA = await Tenant.create({ name: `Edge A ${uid}`, code: `EA-${uid}` });
    const tB = await Tenant.create({ name: `Edge B ${uid}`, code: `EB-${uid}` });
    created.tenants.push(tA._id, tB._id);
    const mk = async (role, tenant, first) => {
      const u = await User.create({
        email: `${first.toLowerCase()}-${uid.toLowerCase()}@edge.test`, password: 'Edge-Test-123!',
        firstName: first, lastName: 'Test', role, tenant_id: tenant._id,
      });
      created.users.push(u._id);
      return u;
    };
    const admin = await mk('admin_ddene', tA, 'Admin');
    const teacher = await mk('teacher', tA, 'Prof');
    const s1 = await mk('student', tA, 'Ana');
    const s2 = await mk('student', tA, 'Bel');
    const s3 = await mk('student', tA, 'Cal'); // de l'etablissement, hors classe du centre
    const sB = await mk('student', tB, 'Dov'); // autre etablissement
    const adminB = await mk('admin_ddene', tB, 'AdminB');
    const classA = await CrnsClassroom.create({
      course_id: 'ecrou_hexagonal_v1', name: '9e A', code: `CL-${uid.slice(-4)}`,
      teacher_id: teacher._id, tenant_id: tA._id, student_ids: [s1._id, s2._id],
    });
    const classB = await CrnsClassroom.create({
      course_id: 'x', name: 'B', code: `CL-B${uid.slice(-3)}`, teacher_id: adminB._id, tenant_id: tB._id, student_ids: [sB._id],
    });
    const course = await Module.create({ title: `Cours edge ${uid}`, tenant_id: tA._id, created_by: teacher._id, sections: [] });
    const adminTok = userToken(admin);

    // --- Centres ---
    console.log('--- Centres ---');
    let r = await api('POST', '/centers', { center_id: centerId, name: 'Salle pilote', classroom_ids: [classA._id] }, adminTok);
    assert(r.status === 201 && /^tegs_edge_/.test(r.data?.token || ''), 'Creation : 201 + jeton tegs_edge_ montre une fois');
    assert(r.data?.center && !('token_hash' in r.data.center), "Creation : l'empreinte du jeton n'est pas exposee");
    let token = r.data.token;
    const centerDbId = r.data.center.id;

    r = await api('POST', '/centers', { center_id: centerId, name: 'Doublon' }, adminTok);
    assert(r.status === 409, 'center_id deja utilise -> 409');
    r = await api('POST', '/centers', { center_id: `${centerId}-X`, name: 'X', classroom_ids: [classB._id] }, adminTok);
    assert(r.status === 400, "Classe d'un autre etablissement -> 400");
    r = await api('POST', '/centers', { center_id: `${centerId}-Y`, name: 'Y' }, userToken(teacher));
    assert(r.status === 403, 'Enseignant -> 403');
    r = await api('GET', '/centers', null, adminTok);
    assert(r.status === 200 && r.data.centers.some((c) => c.center_id === centerId), 'Liste des centres');
    r = await api('GET', '/centers', null, userToken(adminB));
    assert(r.status === 200 && !r.data.centers.some((c) => c.center_id === centerId), "Isolation : l'autre etablissement ne voit pas le centre");

    // --- Pull ---
    console.log('\n--- Pull ---');
    r = await edge('/pull', {}, {});
    assert(r.status === 401, 'Sans en-tetes -> 401');
    r = await edge('/pull', {}, { centerId, token: 'tegs_edge_faux' });
    assert(r.status === 401, 'Jeton faux -> 401');
    r = await edge('/pull', {}, { centerId: 'INCONNU-01', token });
    assert(r.status === 401, 'Centre inconnu -> 401 (meme reponse que jeton faux)');
    r = await edge('/pull', { center_id: 'AUTRE-01' }, { centerId, token });
    assert(r.status === 400, 'center_id du corps different -> 400');

    r = await edge('/pull', { center_id: centerId, edge_version: '0.1.0-test', installed_modules: {} }, { centerId, token });
    assert(r.status === 200 && r.data.status === 'SUCCESS', 'Pull valide -> SUCCESS');
    const ids = (r.data.roster_updates || []).map((s) => s.id).sort();
    assert(JSON.stringify(ids) === JSON.stringify([String(s1._id), String(s2._id)].sort()), 'Roster : les 2 eleves de la classe du centre, pas les autres');
    assert(r.data.roster_updates.every((s) => s.classroom_id === String(classA._id) && s.action === 'UPSERT'), 'Roster : classe et action UPSERT');
    assert(r.data.roster_active_ids.length === 2, 'roster_active_ids : 2');
    const updates = r.data.module_updates || [];
    assert(updates.length > 0 && updates.every((m) => /^[0-9a-f]{64}$/.test(m.sha256) && /^https:/.test(m.download_url)), 'Simulations : paquets avec sha256 et URL');
    assert(!Number.isNaN(Date.parse(r.data.server_time)), 'server_time renvoye');
    const cursor = r.data.roster_cursor;
    const [m0, m1] = updates;

    r = await edge('/pull', {
      installed_modules: { [m0.id]: m0.sha256, [m1.id]: '0'.repeat(64), sim_retiree_v1: '1.0.0' },
    }, { centerId, token });
    const upIds = r.data.module_updates.map((m) => m.id);
    assert(!upIds.includes(m0.id), 'Paquet a jour (meme sha256) : pas renvoye');
    assert(upIds.includes(m1.id), 'Paquet perime (sha256 different) : renvoye');
    assert(r.data.modules_removed.includes('sim_retiree_v1'), 'Simulation retiree -> modules_removed');

    r = await edge('/pull', { last_roster_sync: cursor }, { centerId, token });
    assert(r.data.roster_updates.length === 0, 'Delta : rien de neuf depuis le curseur');
    await new Promise((ok) => setTimeout(ok, 20));
    await CrnsClassroom.updateOne({ _id: classA._id }, { $push: { student_ids: s3._id } });
    r = await edge('/pull', { last_roster_sync: cursor }, { centerId, token });
    assert(r.data.roster_updates.length === 3, 'Delta : classe modifiee -> tout son effectif (3)');
    await CrnsClassroom.updateOne({ _id: classA._id }, { $pull: { student_ids: s3._id } });

    // --- Push ---
    console.log('\n--- Push ---');
    const sub = (over = {}) => ({
      submission_id: `sub-${uid}-${crypto.randomBytes(4).toString('hex')}`,
      student_id: String(s1._id), module_id: m0.id, classroom_id: String(classA._id),
      completed_at: new Date(Date.now() - 3600 * 1000 - 60 * 1000).toISOString(), // horloge du noeud en retard d'1 h
      duration_ms: 125000, score: 18.5, max_score: 20,
      submission_payload: { voltage_measurements: [110.2, 110.5], passed_validation: true },
      anti_fraud_logs: { focus_loss_count: 0, ip_client: '192.168.10.54' },
      ...over,
    });
    const edgeSentAt = new Date(Date.now() - 3600 * 1000).toISOString();
    const good = [sub(), sub({ module_id: String(course._id), student_id: String(s2._id), score: 12, max_score: 20 })];
    const batch = { center_id: centerId, batch_id: `batch-${uid}`, edge_sent_at: edgeSentAt, submissions: good };

    r = await edge('/push', batch, { centerId, token });
    assert(r.status === 401, 'Sans signature -> 401');
    r = await edge('/push', batch, { centerId, token, signature: 'sha256=' + '0'.repeat(64) });
    assert(r.status === 401, 'Signature fausse -> 401');

    r = await edge('/push', batch, { centerId, token, sign: true });
    assert(r.status === 200 && r.data.status === 'ACK' && r.data.processed_ids.length === 2, 'Lot valide -> ACK, 2 copies');
    const offset = r.data.clock_offset_ms;
    assert(offset > 3590 * 1000 && offset < 3700 * 1000, `Ecart d'horloge mesure ~1 h (${Math.round(offset / 1000)} s)`);
    const st = await Statement.findOne({ statementId: good[0].submission_id }).lean();
    assert(!!st && String(st.tenant_id) === String(tA._id), "Trace xAPI creee dans l'etablissement");
    const corrected = Date.parse(good[0].completed_at) + offset;
    assert(st && Math.abs(new Date(st.timestamp).getTime() - corrected) < 1000, 'timestamp = completed_at corrige de l\'ecart');
    assert(st?.result?.score?.scaled === 18.5 / 20 && st?.result?.success === true && st?.result?.duration === 'PT125S', 'Score, reussite et duree relative');
    assert(st?.context?.extensions?.edge?.center_id === centerId && st?.object?.id.endsWith(`/sim/${m0.id}`), 'Extensions edge + IRI de simulation');
    const st2 = await Statement.findOne({ statementId: good[1].submission_id }).lean();
    assert(st2?.object?.id.endsWith(`/courses/${course._id}`), 'IRI de module de cours');

    r = await edge('/push', batch, { centerId, token, sign: true });
    const count = await Statement.countDocuments({ statementId: { $in: good.map((g) => g.submission_id) } });
    assert(r.data.status === 'ACK' && r.data.duplicates === 2 && count === 2, 'Renvoi du meme lot -> ACK idempotent, pas de doublon');

    const mixed = {
      batch_id: `mixed-${uid}`, edge_sent_at: new Date().toISOString(),
      submissions: [
        sub({ student_id: String(s3._id) }), // hors classe mais dans l'etablissement : accepte
        sub({ student_id: String(sB._id) }),
        sub({ module_id: 'sim_inconnue_v1' }),
        sub({ score: 25 }),
        sub({ submission_id: 'x' }),
      ],
    };
    r = await edge('/push', mixed, { centerId, token, sign: true });
    const codes = Object.fromEntries((r.data.rejected || []).map((x) => [x.code, x]));
    assert(r.data.status === 'PARTIAL' && r.data.processed_ids.length === 1, 'Lot mixte -> PARTIAL, 1 acceptee');
    assert(codes.unknown_student && codes.unknown_module && codes.invalid_score && codes.invalid_submission_id, 'Rejets : unknown_student, unknown_module, invalid_score, invalid_submission_id');
    assert(r.data.rejected.every((x) => x.retryable === false), 'Rejets de donnees : non reessayables');

    r = await edge('/push', { submissions: [sub({ student_id: String(sB._id) })] }, { centerId, token, sign: true });
    assert(r.data.status === 'REJECT' && r.data.processed_ids.length === 0, 'Tout invalide -> REJECT');
    r = await edge('/push', { submissions: Array.from({ length: 501 }, () => sub()) }, { centerId, token, sign: true });
    assert(r.status === 413, 'Plus de 500 copies -> 413');

    // --- Rotation et desactivation ---
    console.log('\n--- Rotation et desactivation ---');
    r = await api('POST', `/centers/${centerDbId}/rotate-token`, null, adminTok);
    const newToken = r.data?.token;
    assert(r.status === 200 && newToken && newToken !== token, 'Rotation : nouveau jeton');
    r = await edge('/pull', {}, { centerId, token });
    assert(r.status === 401, 'Ancien jeton -> 401');
    r = await edge('/pull', {}, { centerId, token: newToken });
    assert(r.status === 200, 'Nouveau jeton -> 200');
    token = newToken;
    r = await api('PATCH', `/centers/${centerDbId}`, { isActive: false }, adminTok);
    r = await edge('/pull', {}, { centerId, token });
    assert(r.status === 403, 'Centre desactive -> 403');
    const c = await Center.findById(centerDbId).lean();
    assert(c.edge_version === '0.1.0-test' && c.last_push_at && c.last_clock_offset_ms !== null, 'Etat du noeud enregistre (version, dernier push, ecart)');
  } finally {
    await Statement.deleteMany({ tenant_id: { $in: created.tenants } });
    await Center.deleteMany({ center_id: { $regex: `^${centerId}` } });
    await CrnsClassroom.deleteMany({ tenant_id: { $in: created.tenants } });
    await Module.deleteMany({ tenant_id: { $in: created.tenants } });
    await User.deleteMany({ _id: { $in: created.users } });
    await Tenant.deleteMany({ _id: { $in: created.tenants } });
    await mongoose.disconnect();
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  RESULTATS : ${passed} passes / ${passed + failed} total`);
  console.log(failed > 0 ? `  ${failed} ECHEC(S)` : '  TOUS LES TESTS PASSENT');
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async (err) => {
  console.error('Erreur fatale:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
