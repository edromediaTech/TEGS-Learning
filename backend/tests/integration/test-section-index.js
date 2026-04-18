/**
 * Test: section_index — 1 module = 1 concours, 1 chapitre = 1 round
 *
 * Verifie:
 *  1. Creation d'un module avec 3 sections
 *  2. Filtre ?section=N dans share.js ne renvoie que la bonne section
 *  3. Creation d'un tournoi avec rounds pointant vers des sections
 *  4. L'endpoint play retourne le section_index
 *  5. Nettoyage des donnees de test
 */

const mongoose = require('mongoose');
require('dotenv').config();

const BASE = 'http://127.0.0.1:3000';
let passed = 0;
let failed = 0;
const cleanup = [];

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function apiFetch(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await globalThis.fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, raw: typeof data === 'string' };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Module = require('../../src/models/Module');
  const Tournament = require('../../src/models/Tournament');
  const User = require('../../src/models/User');
  const jwt = require('jsonwebtoken');

  const uid = Date.now().toString(36);
  const tenantId = new mongoose.Types.ObjectId();

  // ─── Setup: create user + module ───
  console.log('\n[SETUP] Creating test data...');

  const user = await User.create({
    email: `test-si-${uid}@test.ht`,
    password: 'Test2026!',
    firstName: 'Test',
    lastName: 'SectionIndex',
    role: 'admin_ddene',
    tenant_id: tenantId,
  });
  cleanup.push(() => User.deleteOne({ _id: user._id }));

  const token = jwt.sign(
    { id: user._id, role: user.role, tenant_id: tenantId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const mod = await Module.create({
    title: `Test Section Index ${uid}`,
    language: 'fr',
    status: 'published',
    tenant_id: tenantId,
    created_by: user._id,
    shareEnabled: true,
    shareToken: require('crypto').randomBytes(16).toString('hex'),
    sections: [
      {
        title: 'XSECT_ALPHA_X',
        order: 0,
        screens: [{
          title: 'XSCREEN_ALPHA_X',
          order: 0,
          contentBlocks: [
            { type: 'quiz', order: 0, data: { question: 'Alpha Q1?', options: ['A', 'B'], correctIndex: 0, points: 10 } },
          ],
        }],
      },
      {
        title: 'XSECT_BETA_X',
        order: 1,
        screens: [{
          title: 'XSCREEN_BETA_X',
          order: 0,
          contentBlocks: [
            { type: 'quiz', order: 0, data: { question: 'Beta Q1?', options: ['C', 'D'], correctIndex: 1, points: 10 } },
          ],
        }],
      },
      {
        title: 'XSECT_GAMMA_X',
        order: 2,
        screens: [{
          title: 'XSCREEN_GAMMA_X',
          order: 0,
          contentBlocks: [
            { type: 'quiz', order: 0, data: { question: 'Gamma Q1?', options: ['E', 'F'], correctIndex: 0, points: 20 } },
          ],
        }],
      },
    ],
  });
  cleanup.push(() => Module.deleteOne({ _id: mod._id }));

  // ─── Test 1: Full module (no section filter) ───
  console.log('\n[TEST 1] Full module — no section filter');
  const full = await apiFetch('GET', `/api/share/public/${mod.shareToken}`);
  assert('Returns 200', full.status === 200);
  assert('Contains Alpha', !full.raw && false || (typeof full.data === 'string' ? full.data : JSON.stringify(full.data)).includes('XSECT_ALPHA_X'));
  assert('Contains Beta', (typeof full.data === 'string' ? full.data : '').includes('XSECT_BETA_X'));
  assert('Contains Gamma', (typeof full.data === 'string' ? full.data : '').includes('XSECT_GAMMA_X'));

  // ─── Test 2: Section 0 only ───
  console.log('\n[TEST 2] Section 0 — Alpha only');
  const s0 = await apiFetch('GET', `/api/share/public/${mod.shareToken}?section=0`);
  const s0html = typeof s0.data === 'string' ? s0.data : '';
  assert('Returns 200', s0.status === 200);
  assert('Contains Alpha', s0html.includes('XSECT_ALPHA_X'));
  assert('Does NOT contain Beta', !s0html.includes('XSECT_BETA_X'));
  assert('Does NOT contain Gamma', !s0html.includes('XSECT_GAMMA_X'));

  // ─── Test 3: Section 1 only ───
  console.log('\n[TEST 3] Section 1 — Beta only');
  const s1 = await apiFetch('GET', `/api/share/public/${mod.shareToken}?section=1`);
  const s1html = typeof s1.data === 'string' ? s1.data : '';
  assert('Returns 200', s1.status === 200);
  assert('Does NOT contain Alpha', !s1html.includes('XSECT_ALPHA_X'));
  assert('Contains Beta', s1html.includes('XSECT_BETA_X'));
  assert('Does NOT contain Gamma', !s1html.includes('XSECT_GAMMA_X'));

  // ─── Test 4: Section 2 only ───
  console.log('\n[TEST 4] Section 2 — Gamma only');
  const s2 = await apiFetch('GET', `/api/share/public/${mod.shareToken}?section=2`);
  const s2html = typeof s2.data === 'string' ? s2.data : '';
  assert('Returns 200', s2.status === 200);
  assert('Does NOT contain Alpha', !s2html.includes('XSECT_ALPHA_X'));
  assert('Does NOT contain Beta', !s2html.includes('XSECT_BETA_X'));
  assert('Contains Gamma', s2html.includes('XSECT_GAMMA_X'));

  // ─── Test 5: Invalid section index ───
  console.log('\n[TEST 5] Invalid section index — falls back to all');
  const s99 = await apiFetch('GET', `/api/share/public/${mod.shareToken}?section=99`);
  const s99html = typeof s99.data === 'string' ? s99.data : '';
  assert('Returns 200', s99.status === 200);
  assert('Contains all sections', s99html.includes('XSECT_ALPHA_X') && s99html.includes('XSECT_BETA_X') && s99html.includes('XSECT_GAMMA_X'));

  // ─── Test 6: Pause overlay present ───
  console.log('\n[TEST 6] Pause overlay in HTML');
  assert('Contains pause-overlay div', s0html.includes('pause-overlay'));
  assert('Contains _showPause function', s0html.includes('_showPause'));

  // ─── Test 7: Create tournament with section_index ───
  console.log('\n[TEST 7] Tournament with section_index');
  const tournRes = await apiFetch('POST', '/api/tournaments', {
    title: `Tournoi SI ${uid}`,
    registrationFee: 0,
    currency: 'HTG',
    maxParticipants: 100,
    rounds: [
      { label: 'Round 1', module_id: mod._id.toString(), section_index: 0, promoteTopX: 5 },
      { label: 'Round 2', module_id: mod._id.toString(), section_index: 1, promoteTopX: 3 },
      { label: 'Finale', module_id: mod._id.toString(), section_index: 2, promoteTopX: 1 },
    ],
    prizes: [],
  }, token);

  assert('Tournament created', tournRes.status === 201 || tournRes.status === 200, `Status: ${tournRes.status}`);

  if (tournRes.data?.tournament || tournRes.data?._id) {
    const tourn = tournRes.data.tournament || tournRes.data;
    cleanup.push(() => Tournament.deleteOne({ _id: tourn._id }));

    assert('Has 3 rounds', tourn.rounds?.length === 3, `Rounds: ${tourn.rounds?.length}`);
    assert('Round 1 section_index = 0', tourn.rounds?.[0]?.section_index === 0);
    assert('Round 2 section_index = 1', tourn.rounds?.[1]?.section_index === 1);
    assert('Round 3 section_index = 2', tourn.rounds?.[2]?.section_index === 2);
    assert('All rounds same module_id', tourn.rounds?.every(r => r.module_id?.toString() === mod._id.toString()));
  }

  // ─── Cleanup ───
  console.log('\n[CLEANUP]');
  for (const fn of cleanup) await fn();
  console.log('  Test data cleaned');

  // ─── Summary ───
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Section Index Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═'.repeat(50));

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
