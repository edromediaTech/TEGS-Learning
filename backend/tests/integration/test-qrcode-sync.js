/**
 * TEGS-Learning - Tests QR Code & SQLite Import
 *
 * Ce script valide :
 * 1. QR Code module (PNG)
 * 2. QR Code module (SVG)
 * 3. QR Code module data URL
 * 4. QR Code module 404
 * 5. QR Badge student
 * 6. QR Badge 404 (mauvais user)
 * 7. QR Decode badge valide
 * 8. QR Decode sans qrData -> 400
 * 9. QR Decode JSON invalide -> 400
 * 10. QR Decode mauvais type -> 400
 * 11. SQLite import results
 * 12. SQLite import attendance
 * 13. SQLite import deduplication (idempotent)
 * 14. SQLite import validation (missing tables)
 * 15. SQLite import max 1000 limit
 * 16. SQLite import validation (missing fields)
 * 17. Analytics overview apres import
 * 18. Sync status apres import
 *
 * Pre-requis : MongoDB running, backend accessible
 * Usage : node test-qrcode-sync.js
 *
 * Ce script utilise une connexion Mongoose directe pour le bootstrap
 * (creation tenant + users) puis teste les routes HTTP.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { fetch: undiciFetch } = require('undici');

const Tenant = require('../../src/models/Tenant');
const User = require('../../src/models/User');
const Module = require('../../src/models/Module');

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}/api`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning';
const JWT_SECRET = process.env.JWT_SECRET || 'tegs_learning_dev_secret_change_in_production';

async function request(method, urlPath, body, token) {
  const url = urlPath.startsWith('http') ? urlPath : `${BASE_URL}${urlPath}`;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await undiciFetch(url, options);
  const ct = res.headers.get('content-type') || '';
  let data;
  if (ct.includes('json')) data = await res.json().catch(() => null);
  else if (ct.includes('svg') || ct.includes('text')) data = await res.text();
  else data = await res.arrayBuffer();
  return { status: res.status, data, headers: res.headers, contentType: ct };
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${testName}`);
    failed++;
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, tenant_id: user.tenant_id?.toString() },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTests() {
  console.log('=== TEGS-Learning | Tests QR Code & SQLite Import ===\n');

  // Connect to MongoDB for bootstrap
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connecte pour bootstrap\n');

  const uid = Date.now().toString(36);

  // -----------------------------------------------------------------------
  // 0. Setup via Mongoose direct
  // -----------------------------------------------------------------------
  console.log('--- Setup (Mongoose direct) ---');

  const tenant = await Tenant.create({
    name: `Ecole QR Test ${uid}`,
    code: `QR-${uid}`,
    address: 'Test District',
  });
  assert(!!tenant, 'Tenant cree via Mongoose');
  const tenantId = tenant._id;

  const bcrypt = require('bcryptjs');
  const hashedPw = await bcrypt.hash('QRAdmin123!', 10);

  const adminUser = await User.create({
    email: `qr-admin-${uid}@test.ht`,
    password: hashedPw,
    firstName: 'QR',
    lastName: 'Admin',
    role: 'admin_ddene',
    tenant_id: tenantId,
  });
  assert(!!adminUser, 'Admin cree via Mongoose');
  const token = generateToken(adminUser);
  const userId = adminUser._id.toString();

  const studentUser = await User.create({
    email: `qr-student-${uid}@test.ht`,
    password: hashedPw,
    firstName: 'Eleve',
    lastName: 'Test',
    role: 'student',
    tenant_id: tenantId,
  });
  assert(!!studentUser, 'Student cree via Mongoose');
  const studentId = studentUser._id.toString();

  const mod = await Module.create({
    title: `Module QR ${uid}`,
    description: 'Module de test QR',
    subject: 'test',
    grade: '1ere',
    tenant_id: tenantId,
    created_by: adminUser._id,
  });
  assert(!!mod, 'Module cree via Mongoose');
  const moduleId = mod._id.toString();

  // Verify API is reachable
  const health = await request('GET', '/health');
  assert(health.status === 200, 'API health check OK');

  // -----------------------------------------------------------------------
  // 1. QR Code module PNG
  // -----------------------------------------------------------------------
  console.log('\n--- QR Code Module ---');

  const qrPng = await request('GET', `/qr/module/${moduleId}`, null, token);
  assert(qrPng.status === 200, 'QR PNG status 200');
  assert(qrPng.contentType.includes('image/png'), 'QR PNG content-type image/png');
  assert(qrPng.data.byteLength > 100, 'QR PNG a du contenu (buffer > 100 bytes)');

  // -----------------------------------------------------------------------
  // 2. QR Code module SVG
  // -----------------------------------------------------------------------
  const qrSvg = await request('GET', `/qr/module/${moduleId}?format=svg`, null, token);
  assert(qrSvg.status === 200, 'QR SVG status 200');
  assert(qrSvg.contentType.includes('svg'), 'QR SVG content-type svg');
  assert(typeof qrSvg.data === 'string' && qrSvg.data.includes('<svg'), 'QR SVG contient balise <svg>');

  // -----------------------------------------------------------------------
  // 3. QR Code data URL
  // -----------------------------------------------------------------------
  const qrData = await request('GET', `/qr/module/${moduleId}/data`, null, token);
  assert(qrData.status === 200, 'QR Data URL status 200');
  assert(qrData.data.qrDataUrl && qrData.data.qrDataUrl.startsWith('data:image/png;base64,'), 'QR Data URL base64 valide');
  assert(qrData.data.moduleId === moduleId, 'QR Data URL moduleId correct');
  assert(qrData.data.title === `Module QR ${uid}`, 'QR Data URL title correct');
  assert(!!qrData.data.shareUrl, 'QR Data URL contient shareUrl');

  // -----------------------------------------------------------------------
  // 4. QR Code module 404
  // -----------------------------------------------------------------------
  const qr404 = await request('GET', '/qr/module/000000000000000000000000', null, token);
  assert(qr404.status === 404, 'QR module inexistant -> 404');

  // -----------------------------------------------------------------------
  // 5. QR Badge student
  // -----------------------------------------------------------------------
  console.log('\n--- QR Badge ---');

  const badge = await request('GET', `/qr/badge/${moduleId}/${userId}`, null, token);
  assert(badge.status === 200, 'QR Badge status 200');
  assert(badge.contentType.includes('image/png'), 'QR Badge content-type image/png');

  // -----------------------------------------------------------------------
  // 6. QR Badge 404 (mauvais user)
  // -----------------------------------------------------------------------
  const badge404 = await request('GET', `/qr/badge/${moduleId}/000000000000000000000000`, null, token);
  assert(badge404.status === 404, 'QR Badge user inexistant -> 404');

  // -----------------------------------------------------------------------
  // 7. QR Decode badge valide
  // -----------------------------------------------------------------------
  console.log('\n--- QR Decode ---');

  const decodeRes = await request('POST', '/qr/decode', {
    qrData: JSON.stringify({
      type: 'tegs-badge',
      moduleId,
      userId,
      tenant: tenantId.toString(),
      ts: Date.now(),
    }),
  }, token);
  assert(decodeRes.status === 200, 'QR Decode status 200');
  assert(decodeRes.data.student && decodeRes.data.student.name === 'QR Admin', 'QR Decode student name correct');
  assert(decodeRes.data.module && decodeRes.data.module.id === moduleId, 'QR Decode module id correct');
  assert(decodeRes.data.result === null, 'QR Decode result null (pas de QuizResult)');
  assert(decodeRes.data.badge === null, 'QR Decode badge null (pas de resultat)');

  // -----------------------------------------------------------------------
  // 8. QR Decode sans qrData -> 400
  // -----------------------------------------------------------------------
  const decodeEmpty = await request('POST', '/qr/decode', {}, token);
  assert(decodeEmpty.status === 400, 'QR Decode sans qrData -> 400');

  // -----------------------------------------------------------------------
  // 9. QR Decode JSON invalide -> 400
  // -----------------------------------------------------------------------
  const decodeBad = await request('POST', '/qr/decode', { qrData: 'not-json' }, token);
  assert(decodeBad.status === 400, 'QR Decode JSON invalide -> 400');

  // -----------------------------------------------------------------------
  // 10. QR Decode mauvais type -> 400
  // -----------------------------------------------------------------------
  const decodeWrongType = await request('POST', '/qr/decode', {
    qrData: JSON.stringify({ type: 'random', moduleId, userId }),
  }, token);
  assert(decodeWrongType.status === 400, 'QR Decode mauvais type -> 400');

  // -----------------------------------------------------------------------
  // 11. SQLite import results
  // -----------------------------------------------------------------------
  console.log('\n--- SQLite Import ---');

  const importRes = await request('POST', '/sync/sqlite-import', {
    tables: {
      results: [
        {
          student_name: 'Jean Pierre',
          student_email: 'jean@ecole.ht',
          subject: `math-qr-${uid}`,
          score: 85,
          max_score: 100,
          passed: true,
          completed_at: '2026-03-20T10:00:00Z',
          duration_seconds: 1800,
        },
        {
          student_name: 'Marie Claire',
          student_email: 'marie@ecole.ht',
          subject: `francais-qr-${uid}`,
          score: 40,
          max_score: 100,
          passed: false,
          completed_at: '2026-03-20T11:00:00Z',
          duration_seconds: 900,
        },
        {
          student_name: 'Paul Louis',
          subject: `sciences-qr-${uid}`,
          score: 70,
          max_score: 100,
          completed_at: '2026-03-20T12:00:00Z',
        },
      ],
    },
    deviceId: `desktop-qr-${uid}`,
    exportedAt: '2026-03-20T09:00:00Z',
  }, token);
  assert(importRes.status === 200, 'SQLite import status 200');
  assert(importRes.data.imported === 3, `SQLite import: ${importRes.data.imported} resultats importes (attendu 3)`);
  assert(importRes.data.tables && importRes.data.tables.results, 'SQLite import: table results dans la reponse');
  assert(importRes.data.tables.results.received === 3, 'SQLite import: 3 recus');
  assert(importRes.data.duplicates === 0, 'SQLite import: 0 doublons');

  // -----------------------------------------------------------------------
  // 12. SQLite import attendance
  // -----------------------------------------------------------------------
  const importAtt = await request('POST', '/sync/sqlite-import', {
    tables: {
      attendance: [
        { student_name: 'Jean Pierre', date: '2026-03-20', present: true },
        { student_name: 'Marie Claire', date: '2026-03-20', present: false },
        { student_name: 'Paul Louis', date: '2026-03-20', present: true },
      ],
    },
    deviceId: `desktop-qr-${uid}`,
  }, token);
  assert(importAtt.status === 200, 'SQLite import attendance status 200');
  assert(importAtt.data.imported === 3, `SQLite import: ${importAtt.data.imported} presences importees (attendu 3)`);
  assert(importAtt.data.tables && importAtt.data.tables.attendance, 'Attendance table dans reponse');

  // -----------------------------------------------------------------------
  // 13. SQLite import deduplication (idempotent)
  // -----------------------------------------------------------------------
  const importDup = await request('POST', '/sync/sqlite-import', {
    tables: {
      results: [
        {
          student_name: 'Jean Pierre',
          student_email: 'jean@ecole.ht',
          subject: `math-qr-${uid}`,
          score: 85,
          max_score: 100,
          passed: true,
          completed_at: '2026-03-20T10:00:00Z',
        },
      ],
    },
    deviceId: `desktop-qr-${uid}`,
  }, token);
  assert(importDup.status === 200, 'SQLite import doublon status 200');
  const dupInserted = importDup.data.imported || 0;
  const dupDuplicates = importDup.data.duplicates || 0;
  assert(dupInserted === 0 || dupDuplicates >= 1, 'SQLite deduplication fonctionne');

  // -----------------------------------------------------------------------
  // 14. SQLite import validation (missing tables)
  // -----------------------------------------------------------------------
  const importNoTables = await request('POST', '/sync/sqlite-import', {
    deviceId: 'test',
  }, token);
  assert(importNoTables.status === 400, 'SQLite import sans tables -> 400');

  // -----------------------------------------------------------------------
  // 15. SQLite import max 1000 limit
  // -----------------------------------------------------------------------
  const bigResults = Array.from({ length: 1001 }, (_, i) => ({
    student_name: `Student ${i}`,
    subject: `subject-${i}`,
    score: 50,
    max_score: 100,
  }));
  const importMax = await request('POST', '/sync/sqlite-import', {
    tables: { results: bigResults },
  }, token);
  assert(importMax.status === 400, 'SQLite import > 1000 -> 400');

  // -----------------------------------------------------------------------
  // 16. SQLite import validation (missing fields)
  // -----------------------------------------------------------------------
  const importBadFields = await request('POST', '/sync/sqlite-import', {
    tables: {
      results: [
        { student_name: 'Test' }, // missing subject and score
      ],
    },
  }, token);
  assert(importBadFields.status === 200, 'SQLite import champs manquants status 200');
  assert(importBadFields.data.errors && importBadFields.data.errors.length > 0, 'SQLite import champs manquants -> erreur reportee');

  // -----------------------------------------------------------------------
  // 17. Analytics overview apres import
  // -----------------------------------------------------------------------
  console.log('\n--- Verification Analytics ---');

  const analytics = await request('GET', '/analytics/overview', null, token);
  assert(analytics.status === 200, 'Analytics overview status 200');
  assert(analytics.data.totalStatements >= 3, `Analytics: ${analytics.data.totalStatements} statements (attendu >= 3)`);
  assert(analytics.data.successRate !== undefined, 'Analytics: successRate present');
  assert(analytics.data.verbBreakdown && analytics.data.verbBreakdown.length > 0, 'Analytics: verbBreakdown non vide');

  // -----------------------------------------------------------------------
  // 18. Sync status apres import
  // -----------------------------------------------------------------------
  const syncStatus = await request('GET', '/sync/status', null, token);
  assert(syncStatus.status === 200, 'Sync status 200');
  assert(syncStatus.data.total >= 3, `Sync total: ${syncStatus.data.total} (attendu >= 3)`);
  const desktopSource = syncStatus.data.sources.find(s => s.source === 'sigeee-desktop');
  assert(desktopSource && desktopSource.count >= 3, 'Sync: source sigeee-desktop presente');

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  await mongoose.disconnect();

  // -----------------------------------------------------------------------
  // Resume
  // -----------------------------------------------------------------------
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  RESULTATS : ${passed} passes / ${passed + failed} total`);
  if (failed > 0) {
    console.log(`  ${failed} ECHEC(S)`);
  } else {
    console.log('  TOUS LES TESTS PASSENT');
  }
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async (err) => {
  console.error('Erreur fatale:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
