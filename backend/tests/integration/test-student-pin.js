/**
 * TEGS-Learning - Tests identifiants eleves matricule + PIN (etape E4)
 *
 * Creation des eleves par l'enseignant (fiche montree une fois), droits, connexion par
 * PIN, verrouillage apres 5 echecs, regeneration du PIN, limite des echecs par IP,
 * et transmission du matricule + empreinte du PIN au noeud edge (pull).
 *
 * Pre-requis : MongoDB, backend sur localhost:3000 (trust proxy : le test simule
 * une adresse client par X-Forwarded-For pour ne pas bloquer localhost).
 * Usage : node tests/integration/test-student-pin.js
 */

require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { fetch: undiciFetch } = require('undici');

const Tenant = require('../../src/models/Tenant');
const User = require('../../src/models/User');
const CrnsClassroom = require('../../src/models/CrnsClassroom');
const Center = require('../../src/models/Center');

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}/api`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning';
const JWT_SECRET = process.env.JWT_SECRET || 'tegs_learning_dev_secret_change_in_production';
const MATRICULE_RE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

let passed = 0;
let failed = 0;
function assert(condition, testName) {
  if (condition) { console.log(`  [PASS] ${testName}`); passed++; } else { console.log(`  [FAIL] ${testName}`); failed++; }
}

function userToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role, tenant_id: user.tenant_id?.toString() }, JWT_SECRET, { expiresIn: '1h' });
}

// Adresse client simulee, propre a cette execution.
const FAKE_IP = `10.${crypto.randomInt(256)}.${crypto.randomInt(256)}.${crypto.randomInt(256)}`;

async function api(method, path, body, token, ip = FAKE_IP) {
  const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': ip };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await undiciFetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const loginPin = (tenant_id, matricule, pin, ip) => api('POST', '/auth/login-pin', { tenant_id, matricule, pin }, null, ip);
const wrongPin = (pin) => String((Number(pin) + 1) % 1000000).padStart(6, '0');

async function runTests() {
  console.log('=== TEGS-Learning | Tests identifiants eleves matricule + PIN (E4) ===\n');
  await mongoose.connect(MONGODB_URI);
  const uid = Date.now().toString(36).toUpperCase();
  const tenants = [];
  const users = [];

  try {
    const tA = await Tenant.create({ name: `Pin A ${uid}`, code: `PA-${uid}` });
    const tB = await Tenant.create({ name: `Pin B ${uid}`, code: `PB-${uid}` });
    tenants.push(tA._id, tB._id);
    const mk = async (role, tenant, first) => {
      const u = await User.create({
        email: `${first.toLowerCase()}-${uid.toLowerCase()}@pin.test`, password: 'Pin-Test-123!',
        firstName: first, lastName: 'Test', role, tenant_id: tenant._id,
      });
      users.push(u._id);
      return u;
    };
    const teacher = await mk('teacher', tA, 'Prof');
    const other = await mk('teacher', tA, 'Autre');
    const admin = await mk('admin_ddene', tA, 'Admin');
    const outsider = await mk('student', tA, 'Hors');
    const classroom = await CrnsClassroom.create({
      course_id: 'ecrou_hexagonal_v1', name: '9e B', code: `CL-${uid.slice(-4)}`,
      teacher_id: teacher._id, tenant_id: tA._id, student_ids: [],
    });
    const tTok = userToken(teacher);

    // --- Creation des eleves par l'enseignant ---
    console.log("--- Creation par l'enseignant ---");
    const roster = [{ first_name: 'Jean', last_name: 'Baptiste' }, { first_name: 'Rose', last_name: 'Pierre' }, { first_name: 'Marc', last_name: 'Joseph' }];
    let r = await api('POST', `/crns-classrooms/${classroom._id}/students`, { students: roster }, tTok);
    assert(r.status === 201 && r.data.students.length === 3, '3 eleves crees -> 201');
    const sheet = r.data.students || [];
    sheet.forEach((s) => users.push(s.id));
    assert(sheet.every((s) => MATRICULE_RE.test(s.matricule) && /^[0-9]{6}$/.test(s.pin)), 'Fiche : matricule XXXX-XXXX lisible et PIN a 6 chiffres');
    assert(new Set(sheet.map((s) => s.matricule)).size === 3, 'Matricules distincts');
    const cls = await CrnsClassroom.findById(classroom._id).lean();
    assert(cls.student_ids.length === 3, 'Eleves ajoutes a la classe');
    const dbUser = await User.findById(sheet[0].id).select('+pin_hash').lean();
    assert(dbUser.pin_hash?.startsWith('$2') && !JSON.stringify(dbUser).includes(`"${sheet[0].pin}"`), 'PIN stocke hache (bcrypt), jamais en clair');

    r = await api('POST', `/crns-classrooms/${classroom._id}/students`, { students: roster }, userToken(other));
    assert(r.status === 403, "Autre enseignant -> 403");
    r = await api('POST', `/crns-classrooms/${classroom._id}/students`, { students: [{ first_name: 'X' }] }, tTok);
    assert(r.status === 400, 'Nom manquant -> 400');
    r = await api('POST', `/crns-classrooms/${classroom._id}/students`, { students: Array.from({ length: 101 }, () => roster[0]) }, tTok);
    assert(r.status === 400, 'Plus de 100 eleves -> 400');
    r = await api('POST', `/crns-classrooms/${classroom._id}/students`, { students: [roster[0]] }, userToken(admin));
    assert(r.status === 201, 'admin_ddene peut aussi creer des eleves');
    users.push(r.data.students[0].id);

    // --- Connexion par PIN ---
    console.log('\n--- Connexion par PIN ---');
    const [jean, rose] = sheet;
    r = await loginPin(String(tA._id), jean.matricule, jean.pin);
    assert(r.status === 200 && r.data.token && r.data.user.role === 'student', 'Matricule + PIN corrects -> jeton eleve');
    const me = await api('GET', '/auth/me', null, r.data.token);
    assert(me.status === 200, 'Le jeton fonctionne (/auth/me)');
    r = await loginPin(String(tA._id), jean.matricule.toLowerCase(), jean.pin);
    assert(r.status === 200, 'Matricule en minuscules accepte');
    r = await loginPin(String(tB._id), jean.matricule, jean.pin);
    assert(r.status === 401, 'Autre etablissement -> 401');
    r = await loginPin(String(tA._id), 'ZZZZ-ZZZZ', jean.pin);
    assert(r.status === 401, 'Matricule inconnu -> 401');
    r = await loginPin(String(tA._id), jean.matricule, '12ab');
    assert(r.status === 400, 'PIN mal forme -> 400');

    // --- Verrouillage ---
    console.log('\n--- Verrouillage et regeneration ---');
    for (let i = 0; i < 5; i++) r = await loginPin(String(tA._id), rose.matricule, wrongPin(rose.pin));
    assert(r.status === 401, '5 PIN errones -> 401');
    r = await loginPin(String(tA._id), rose.matricule, rose.pin);
    assert(r.status === 423, 'Compte verrouille : meme le bon PIN -> 423');

    r = await api('POST', `/crns-classrooms/${classroom._id}/credentials`, { student_ids: [rose.id] }, tTok);
    const newRose = r.data?.students?.[0];
    assert(r.status === 200 && newRose && newRose.matricule === rose.matricule && newRose.pin !== rose.pin, 'Regeneration : meme matricule, nouveau PIN');
    r = await loginPin(String(tA._id), rose.matricule, newRose.pin);
    assert(r.status === 200, 'Nouveau PIN -> connexion (verrou leve)');
    r = await loginPin(String(tA._id), rose.matricule, rose.pin);
    assert(r.status === 401, 'Ancien PIN -> 401');
    r = await api('POST', `/crns-classrooms/${classroom._id}/credentials`, { student_ids: [String(outsider._id)] }, tTok);
    assert(r.status === 400, 'Eleve hors de la classe -> 400');
    r = await api('POST', `/crns-classrooms/${classroom._id}/credentials`, {}, tTok);
    assert(r.status === 200 && r.data.students.length === 4, 'Regeneration de toute la classe (4)');
    const fresh = Object.fromEntries(r.data.students.map((s) => [s.id, s]));

    // --- Transmission au noeud edge ---
    console.log('\n--- Noeud edge (pull) ---');
    const adminTok = userToken(admin);
    const centerId = `TEST-PIN-${uid}`;
    r = await api('POST', '/centers', { center_id: centerId, name: 'Salle PIN', classroom_ids: [classroom._id] }, adminTok);
    const nodeToken = r.data?.token;
    const pull = await undiciFetch(`${BASE_URL}/v1/edge/sync/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, Authorization: `Bearer ${nodeToken}` },
      body: JSON.stringify({}),
    }).then((x) => x.json());
    const jeanEdge = pull.roster_updates?.find((s) => s.id === String(jean.id));
    assert(jeanEdge?.matricule === jean.matricule && jeanEdge?.access_pin_hash?.startsWith('$2'), 'Roster edge : matricule + empreinte bcrypt');
    assert(jeanEdge && await bcrypt.compare(fresh[jean.id].pin, jeanEdge.access_pin_hash), 'Le noeud peut verifier le PIN hors ligne');
    await Center.deleteOne({ center_id: centerId });

    // --- Limite des echecs par IP ---
    console.log('\n--- Limite par adresse IP ---');
    const ip = `10.250.${crypto.randomInt(256)}.${crypto.randomInt(256)}`;
    let first429 = 0;
    for (let i = 1; i <= 31 && !first429; i++) {
      r = await loginPin(String(tA._id), `ZZ${String(i).padStart(2, '0')}-ZZZZ`, '000000', ip);
      if (r.status === 429) first429 = i;
    }
    assert(first429 === 31, `30 echecs autorises, 31e bloque (bloque au ${first429 || 'jamais'})`);
    r = await loginPin(String(tA._id), jean.matricule, fresh[jean.id].pin, ip);
    assert(r.status === 429, 'IP bloquee : meme une bonne connexion attend');
    r = await loginPin(String(tA._id), jean.matricule, fresh[jean.id].pin);
    assert(r.status === 200, 'Une autre IP (autre poste) se connecte normalement');
  } finally {
    await CrnsClassroom.deleteMany({ tenant_id: { $in: tenants } });
    await Center.deleteMany({ center_id: { $regex: `^TEST-PIN-${uid}` } });
    await User.deleteMany({ $or: [{ _id: { $in: users } }, { tenant_id: { $in: tenants } }] });
    await Tenant.deleteMany({ _id: { $in: tenants } });
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
