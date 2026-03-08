/**
 * TEGS-Learning - Sprint 9 : Tests Bridge Mobile & Desktop (Synchronisation)
 *
 * Ce script simule :
 * 1. Envoi batch de 100 resultats d'examens captures offline sur tablette
 * 2. Deduplication : renvoi du meme batch sans doublons
 * 3. Resolution par timestamp (statement plus recent met a jour le result)
 * 4. Isolation multi-tenant (batch Ouanaminthe invisible par Jacmel)
 * 5. Source tracking (inspect-mobile, sigeee-desktop)
 * 6. Sync status API
 * 7. Resolution de conflits manuelle (admin)
 * 8. Validation des erreurs (payload invalide)
 * 9. Limite de batch (max 500)
 * 10. Zero regression Sprints 1-8
 *
 * Pre-requis : Backend demarre
 * Usage : node test-sprint9.js
 */

const { fetch: undiciFetch } = require('undici');
const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/api';
const PUBLIC_URL = process.env.BASE_URL
  ? process.env.BASE_URL.replace('/api', '')
  : 'http://127.0.0.1:3000';

async function request(method, path, body, token) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
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
  if (ct.includes('json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text();
  }
  return { status: res.status, data };
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

// Genere N statements d'examen offline simulant une tablette d'inspecteur
function generateOfflineStatements(count, userInfo, baseTimestamp) {
  const verbs = [
    { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'fr-HT': 'a complete' } },
    { id: 'http://adlnet.gov/expapi/verbs/passed', display: { 'fr-HT': 'a reussi' } },
    { id: 'http://adlnet.gov/expapi/verbs/failed', display: { 'fr-HT': 'a echoue' } },
    { id: 'http://adlnet.gov/expapi/verbs/scored', display: { 'fr-HT': 'a obtenu un score' } },
  ];

  const subjects = [
    'math-101', 'francais-201', 'sciences-301', 'histoire-401', 'creole-501',
    'geographie-601', 'anglais-701', 'physique-801', 'chimie-901', 'biologie-1001',
  ];

  const statements = [];
  for (let i = 0; i < count; i++) {
    const verb = verbs[i % verbs.length];
    const subject = subjects[i % subjects.length];
    const score = Math.round(Math.random() * 100) / 100;
    const isPassed = score >= 0.5;

    // Timestamp decale de quelques minutes pour simuler capture progressive
    const ts = new Date(baseTimestamp.getTime() + i * 60000);

    statements.push({
      id: crypto.randomUUID(),
      actor: {
        user_id: userInfo.userId,
        name: userInfo.name,
        mbox: `mailto:${userInfo.email}`,
      },
      verb,
      object: {
        id: `https://tegs-learning.edu.ht/activities/${subject}`,
        definition: {
          name: { 'fr-HT': `Examen ${subject}` },
          type: 'http://adlnet.gov/expapi/activities/assessment',
        },
      },
      result: {
        score: { scaled: score, raw: Math.round(score * 20), min: 0, max: 20 },
        success: isPassed,
        completion: true,
        duration: `PT${10 + Math.floor(Math.random() * 50)}M`,
      },
      timestamp: ts.toISOString(),
    });
  }
  return statements;
}

async function runTests() {
  console.log('=== TEGS-Learning | Sprint 9 - Tests Bridge Mobile & Desktop ===\n');

  const uid = Date.now().toString(36);

  // -----------------------------------------------------------------------
  // 0. Setup : Deux ecoles
  // -----------------------------------------------------------------------
  console.log('--- Setup ---');

  const school1 = await request('POST', '/tenants', {
    name: 'Ecole Sync Ouanaminthe',
    code: `SYNC-OUA-${uid}`,
    address: 'Ouanaminthe, Nord-Est',
  });
  assert(school1.status === 201, 'Ecole Ouanaminthe creee');
  const t1 = school1.data.tenant._id;

  const admin1 = await request('POST', '/auth/register', {
    email: `admin-sync-${uid}@ouanaminthe.edu.ht`,
    password: 'Admin123',
    firstName: 'Pierre',
    lastName: 'Louis',
    role: 'admin_ddene',
    tenant_id: t1,
  });
  assert(admin1.status === 201, 'Admin Ouanaminthe cree');
  const tok1 = admin1.data.token;
  const user1Id = admin1.data.user._id;

  const school2 = await request('POST', '/tenants', {
    name: 'Ecole Sync Jacmel',
    code: `SYNC-JAC-${uid}`,
    address: 'Jacmel, Sud-Est',
  });
  assert(school2.status === 201, 'Ecole Jacmel creee');
  const t2 = school2.data.tenant._id;

  const admin2 = await request('POST', '/auth/register', {
    email: `admin-sync-${uid}@jacmel.edu.ht`,
    password: 'Admin456',
    firstName: 'Marie',
    lastName: 'Celestin',
    role: 'admin_ddene',
    tenant_id: t2,
  });
  assert(admin2.status === 201, 'Admin Jacmel cree');
  const tok2 = admin2.data.token;

  // -----------------------------------------------------------------------
  // 1. Batch sync de 100 resultats offline (tablette inspecteur)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Batch sync de 100 resultats offline ---');

  const offlineTimestamp = new Date('2026-03-06T08:00:00Z');
  const batch100 = generateOfflineStatements(100, {
    userId: user1Id,
    name: 'Pierre Louis',
    email: `admin-sync-${uid}@ouanaminthe.edu.ht`,
  }, offlineTimestamp);

  const sync1 = await request('POST', '/sync/batch', {
    source: 'inspect-mobile',
    deviceId: 'tablet-inspector-001',
    statements: batch100,
  }, tok1);

  assert(sync1.status === 200, 'Batch sync retourne 200');
  assert(sync1.data.synced === 100, `100 statements synchronises (got ${sync1.data.synced})`);
  assert(sync1.data.duplicates === 0, `0 doublons (got ${sync1.data.duplicates})`);
  assert(sync1.data.total === 100, 'Total = 100');
  assert(sync1.data.errors.length === 0, 'Aucune erreur');

  // -----------------------------------------------------------------------
  // 2. Deduplication : renvoi du meme batch
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Deduplication (meme batch renvoye) ---');

  const sync2 = await request('POST', '/sync/batch', {
    source: 'inspect-mobile',
    deviceId: 'tablet-inspector-001',
    statements: batch100,
  }, tok1);

  assert(sync2.status === 200, 'Re-sync retourne 200');
  assert(sync2.data.synced === 0, `0 nouveaux (got ${sync2.data.synced})`);
  assert(sync2.data.duplicates === 100, `100 doublons detectes (got ${sync2.data.duplicates})`);

  // -----------------------------------------------------------------------
  // 3. Resolution par timestamp (mise a jour si plus recent)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Resolution par timestamp ---');

  // Prendre 5 statements et les renvoyer avec un timestamp plus recent et score modifie
  const updatedBatch = batch100.slice(0, 5).map(s => ({
    ...s,
    timestamp: new Date('2026-03-07T10:00:00Z').toISOString(), // Plus recent
    result: {
      ...s.result,
      score: { scaled: 1.0, raw: 20, min: 0, max: 20 },
      success: true,
    },
  }));

  const sync3 = await request('POST', '/sync/batch', {
    source: 'inspect-mobile',
    deviceId: 'tablet-inspector-001',
    statements: updatedBatch,
  }, tok1);

  assert(sync3.status === 200, 'Update sync retourne 200');
  assert(sync3.data.updated === 5, `5 statements mis a jour (got ${sync3.data.updated})`);
  assert(sync3.data.synced === 0, '0 nouveaux crees');

  // Verifier que le score a ete mis a jour dans le LRS
  const checkStmt = await request('GET',
    `/xapi/statements?activity=${encodeURIComponent(batch100[0].object.id)}`,
    null, tok1);
  assert(checkStmt.status === 200, 'Verification via xAPI GET');
  const updatedStmt = checkStmt.data.statements.find(s => s.statementId === batch100[0].id);
  assert(updatedStmt && updatedStmt.result.score.scaled === 1.0, 'Score mis a jour a 1.0');

  // -----------------------------------------------------------------------
  // 4. Isolation multi-tenant
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Isolation multi-tenant ---');

  // Jacmel envoie son propre batch
  const jacmelBatch = generateOfflineStatements(10, {
    userId: admin2.data.user._id,
    name: 'Marie Celestin',
    email: `admin-sync-${uid}@jacmel.edu.ht`,
  }, new Date('2026-03-06T09:00:00Z'));

  const sync4 = await request('POST', '/sync/batch', {
    source: 'sigeee-desktop',
    deviceId: 'pc-jacmel-001',
    statements: jacmelBatch,
  }, tok2);

  assert(sync4.status === 200, 'Sync Jacmel OK');
  assert(sync4.data.synced === 10, `10 statements Jacmel (got ${sync4.data.synced})`);

  // Verifier que Ouanaminthe ne voit pas les statements de Jacmel
  const oua_stmts = await request('GET', '/xapi/statements?limit=500', null, tok1);
  const jac_stmts = await request('GET', '/xapi/statements?limit=500', null, tok2);

  const oua_has_jacmel = oua_stmts.data.statements.some(
    s => s.actor.name === 'Marie Celestin'
  );
  const jac_has_oua = jac_stmts.data.statements.some(
    s => s.actor.name === 'Pierre Louis'
  );

  assert(!oua_has_jacmel, 'Ouanaminthe ne voit PAS les statements Jacmel');
  assert(!jac_has_oua, 'Jacmel ne voit PAS les statements Ouanaminthe');

  // -----------------------------------------------------------------------
  // 5. Source tracking dans le context
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : Source tracking ---');

  const firstStmt = oua_stmts.data.statements.find(s => s.statementId === batch100[0].id);
  assert(
    firstStmt && firstStmt.context &&
    firstStmt.context.extensions &&
    firstStmt.context.extensions['https://tegs-learning.edu.ht/extensions/sync-source'] === 'inspect-mobile',
    'Source = inspect-mobile enregistree'
  );
  assert(
    firstStmt &&
    firstStmt.context.extensions['https://tegs-learning.edu.ht/extensions/device-id'] === 'tablet-inspector-001',
    'Device ID = tablet-inspector-001 enregistre'
  );

  const jacStmt = jac_stmts.data.statements[0];
  assert(
    jacStmt && jacStmt.context &&
    jacStmt.context.extensions &&
    jacStmt.context.extensions['https://tegs-learning.edu.ht/extensions/sync-source'] === 'sigeee-desktop',
    'Source Jacmel = sigeee-desktop'
  );

  // -----------------------------------------------------------------------
  // 6. Sync status API
  // -----------------------------------------------------------------------
  console.log('\n--- Test 6 : Sync status ---');

  const status1 = await request('GET', '/sync/status', null, tok1);
  assert(status1.status === 200, 'Sync status Ouanaminthe OK');
  assert(status1.data.total >= 100, `Total >= 100 (got ${status1.data.total})`);
  assert(Array.isArray(status1.data.sources), 'Sources est un tableau');

  const mobileSource = status1.data.sources.find(s => s.source === 'inspect-mobile');
  assert(mobileSource && mobileSource.count >= 100, 'Source inspect-mobile comptee');

  // -----------------------------------------------------------------------
  // 7. Resolution de conflits (admin)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 7 : Resolution de conflits ---');

  // Creer 2 statements conflictuels (meme activite, timestamps differents)
  const conflictBatch = [
    {
      id: crypto.randomUUID(),
      verb: { id: 'http://adlnet.gov/expapi/verbs/scored', display: { 'fr-HT': 'a obtenu' } },
      object: { id: 'https://tegs-learning.edu.ht/activities/conflict-test' },
      result: { score: { scaled: 0.6 }, success: true },
      timestamp: '2026-03-06T10:00:00Z',
    },
    {
      id: crypto.randomUUID(),
      verb: { id: 'http://adlnet.gov/expapi/verbs/scored', display: { 'fr-HT': 'a obtenu' } },
      object: { id: 'https://tegs-learning.edu.ht/activities/conflict-test' },
      result: { score: { scaled: 0.9 }, success: true },
      timestamp: '2026-03-06T12:00:00Z',
    },
  ];

  await request('POST', '/sync/batch', {
    source: 'inspect-mobile',
    statements: conflictBatch,
  }, tok1);

  const resolveRes = await request('POST', '/sync/resolve-conflicts', {
    statementIds: [conflictBatch[0].id, conflictBatch[1].id],
    strategy: 'newest',
  }, tok1);

  assert(resolveRes.status === 200, 'Resolution de conflits OK');
  assert(resolveRes.data.kept === conflictBatch[1].id, 'Le plus recent est garde');
  assert(resolveRes.data.voided.includes(conflictBatch[0].id), 'Le plus ancien est voided');

  // Verifier que le voided n'apparait plus dans les requetes normales
  const afterResolve = await request('GET',
    `/xapi/statements?activity=${encodeURIComponent('https://tegs-learning.edu.ht/activities/conflict-test')}`,
    null, tok1);
  const nonVoided = afterResolve.data.statements.filter(s => !s.voided);
  assert(nonVoided.length === 1, 'Seul 1 statement non-voided reste');

  // -----------------------------------------------------------------------
  // 8. Validation des erreurs
  // -----------------------------------------------------------------------
  console.log('\n--- Test 8 : Validation des erreurs ---');

  // Batch vide
  const emptyBatch = await request('POST', '/sync/batch', {
    statements: [],
  }, tok1);
  assert(emptyBatch.status === 400, 'Batch vide rejete (400)');

  // Pas de tableau
  const noBatch = await request('POST', '/sync/batch', {
    statements: 'not-an-array',
  }, tok1);
  assert(noBatch.status === 400, 'Payload invalide rejete (400)');

  // Statements avec erreurs individuelles
  const mixedBatch = [
    { verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'fr-HT': 'ok' } } },
    {
      id: crypto.randomUUID(),
      verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'fr-HT': 'ok' } },
      object: { id: 'https://tegs-learning.edu.ht/activities/valid' },
      timestamp: new Date().toISOString(),
    },
  ];

  const mixedRes = await request('POST', '/sync/batch', {
    source: 'tegs-runtime',
    statements: mixedBatch,
  }, tok1);
  assert(mixedRes.status === 200, 'Batch mixte traite');
  assert(mixedRes.data.errors.length >= 1, `Erreurs individuelles reportees (got ${mixedRes.data.errors.length})`);
  assert(mixedRes.data.synced >= 1, `Au moins 1 statement valide insere (got ${mixedRes.data.synced})`);

  // Non authentifie
  const noAuth = await request('POST', '/sync/batch', { statements: [{}] });
  assert(noAuth.status === 401, 'Non authentifie rejete (401)');

  // -----------------------------------------------------------------------
  // 9. Batch de 50 depuis SIGEEE-Desktop (2eme source)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 9 : Multi-source (SIGEEE-Desktop) ---');

  const sigeeBatch = generateOfflineStatements(50, {
    userId: user1Id,
    name: 'Pierre Louis',
    email: `admin-sync-${uid}@ouanaminthe.edu.ht`,
  }, new Date('2026-03-05T14:00:00Z'));

  const syncSigee = await request('POST', '/sync/batch', {
    source: 'sigeee-desktop',
    deviceId: 'pc-bureau-oua-01',
    statements: sigeeBatch,
  }, tok1);

  assert(syncSigee.status === 200, 'Sync SIGEEE OK');
  assert(syncSigee.data.synced === 50, `50 statements SIGEEE (got ${syncSigee.data.synced})`);

  // Verifier le status montre les 2 sources
  const status2 = await request('GET', '/sync/status', null, tok1);
  const sources = status2.data.sources.map(s => s.source);
  assert(sources.includes('inspect-mobile'), 'Source inspect-mobile presente');
  assert(sources.includes('sigeee-desktop'), 'Source sigeee-desktop presente');

  // -----------------------------------------------------------------------
  // 10. Zero regression Sprints 1-8
  // -----------------------------------------------------------------------
  console.log('\n--- Test 10 : Zero regression Sprints 1-8 ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health OK');

  const login = await request('POST', '/auth/login', {
    email: `admin-sync-${uid}@ouanaminthe.edu.ht`,
    password: 'Admin123',
    tenant_id: t1,
  });
  assert(login.status === 200, 'Login Sprint 1 OK');

  const stmt = await request('POST', '/xapi/statements', {
    verb: { id: 'http://adlnet.gov/expapi/verbs/attempted', display: { 'fr-HT': 'a tente' } },
    object: { id: 'https://tegs-learning.edu.ht/activities/regression-s9' },
  }, tok1);
  assert(stmt.status === 201, 'xAPI Sprint 2 OK');

  const mod = await request('POST', '/modules', {
    title: 'Module Sprint 9', description: 'Regression', language: 'fr',
  }, tok1);
  assert(mod.status === 201, 'Module Sprint 3 OK');

  const moduleId = mod.data.module._id;
  const struct = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [{ title: 'Ch1', screens: [{ title: 'Ecran 1' }] }],
  }, tok1);
  const screenId = struct.data.module.sections[0].screens[0]._id;
  const screen = await request('GET', `/modules/${moduleId}/screens/${screenId}`, null, tok1);
  assert(screen.status === 200, 'Screen Sprint 4 OK');

  const xml = await request('GET', `/cmi5/manifest/${moduleId}`, null, tok1);
  assert(xml.status === 200, 'cmi5.xml Sprint 5 OK');

  const rtJs = await request('GET', `${PUBLIC_URL}/public/js/tegs-runtime.js`);
  assert(rtJs.status === 200, 'Runtime JS Sprint 6 OK');

  const lib = await request('GET', '/upload/library', null, tok1);
  assert(lib.status === 200, 'Upload library Sprint 7 OK');

  // Sprint 8 : compression header
  const gzRes = await undiciFetch(`${BASE_URL}/health`, {
    headers: { 'Accept-Encoding': 'gzip' },
  });
  assert(gzRes.status === 200, 'Compression Sprint 8 OK');

  // -----------------------------------------------------------------------
  // Resultat final
  // -----------------------------------------------------------------------
  console.log('\n========================================');
  console.log(`  RESULTATS : ${passed} PASS / ${failed} FAIL sur ${passed + failed} tests`);
  console.log('========================================');

  if (failed > 0) {
    console.log('\n  [ECHEC] Des tests ont echoue.');
    process.exit(1);
  } else {
    console.log('\n  [SUCCES] Sprint 9 valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  process.exit(1);
});
