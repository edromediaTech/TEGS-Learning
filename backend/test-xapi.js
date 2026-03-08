/**
 * TEGS-Learning - Sprint 2 : Script de Test xAPI Engine & LRS Core
 *
 * Ce script prouve que :
 * 1. On peut enregistrer un statement xAPI (score de quiz reussi)
 * 2. Un statement mal forme est rejete (verbe manquant, verbe invalide)
 * 3. Un admin de Fort-Liberte ne peut PAS voir les traces de Ouanaminthe (isolation)
 * 4. Les tests du Sprint 1 restent fonctionnels (zero regression)
 *
 * Pre-requis : MongoDB en cours d'execution, backend demarre (npm run dev)
 * Usage : node test-xapi.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';

async function request(method, path, body, token) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json();
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

async function runTests() {
  console.log('=== TEGS-Learning | Sprint 2 - Tests xAPI Engine & LRS ===\n');

  // -----------------------------------------------------------------------
  // 0. Setup : Creer 2 ecoles + 1 admin + 1 student dans ecole 1, 1 admin dans ecole 2
  // -----------------------------------------------------------------------
  console.log('--- Setup : Creation des ecoles et utilisateurs ---');

  const school1 = await request('POST', '/tenants', {
    name: 'Ecole Nationale de Ouanaminthe',
    code: 'XAPI-ENO-001',
    address: 'Ouanaminthe, Nord-Est',
  });
  assert(school1.status === 201, 'Ecole 1 creee');
  const tenant1Id = school1.data.tenant._id;

  const school2 = await request('POST', '/tenants', {
    name: 'Ecole Nationale de Fort-Liberte',
    code: 'XAPI-ENFL-001',
    address: 'Fort-Liberte, Nord-Est',
  });
  assert(school2.status === 201, 'Ecole 2 creee');
  const tenant2Id = school2.data.tenant._id;

  // Admin ecole 1
  const admin1Reg = await request('POST', '/auth/register', {
    email: 'admin-xapi@ouanaminthe.edu.ht',
    password: 'Admin123!',
    firstName: 'Jean',
    lastName: 'Baptiste',
    role: 'admin_ddene',
    tenant_id: tenant1Id,
  });
  assert(admin1Reg.status === 201, 'Admin Ecole 1 cree');
  const admin1Token = admin1Reg.data.token;

  // Student ecole 1
  const student1Reg = await request('POST', '/auth/register', {
    email: 'student-xapi@ouanaminthe.edu.ht',
    password: 'Student1!',
    firstName: 'Marie',
    lastName: 'Joseph',
    role: 'student',
    tenant_id: tenant1Id,
  });
  assert(student1Reg.status === 201, 'Student Ecole 1 cree');
  const student1Token = student1Reg.data.token;
  const student1Id = student1Reg.data.user.id;

  // Admin ecole 2
  const admin2Reg = await request('POST', '/auth/register', {
    email: 'admin-xapi@fortliberte.edu.ht',
    password: 'Admin456!',
    firstName: 'Pierre',
    lastName: 'Louis',
    role: 'admin_ddene',
    tenant_id: tenant2Id,
  });
  assert(admin2Reg.status === 201, 'Admin Ecole 2 cree');
  const admin2Token = admin2Reg.data.token;

  // -----------------------------------------------------------------------
  // 1. Enregistrement d'un statement xAPI valide (quiz reussi)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Enregistrement d\'un score de quiz reussi ---');

  const quizStatement = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/passed',
      display: { 'fr-HT': 'a reussi' },
    },
    object: {
      id: 'https://tegs-learning.edu.ht/activities/quiz-math-101',
      objectType: 'Activity',
      definition: {
        name: { 'fr-HT': 'Quiz Mathematiques 101' },
        description: { 'fr-HT': 'Quiz sur les fractions' },
        type: 'http://adlnet.gov/expapi/activities/assessment',
      },
    },
    result: {
      score: {
        scaled: 0.85,
        raw: 17,
        min: 0,
        max: 20,
      },
      success: true,
      completion: true,
      duration: 'PT25M30S',
    },
    context: {
      registration: 'session-2024-001',
      extensions: {
        'https://tegs-learning.edu.ht/ext/class': 'CM2-A',
      },
    },
  }, student1Token);

  assert(quizStatement.status === 201, 'Statement quiz cree (201)');
  assert(!!quizStatement.data.statementId, 'StatementId genere');
  assert(
    quizStatement.data.statement.verb.id === 'http://adlnet.gov/expapi/verbs/passed',
    'Verbe correct (passed)'
  );
  assert(quizStatement.data.statement.result.score.scaled === 0.85, 'Score scaled = 0.85');
  assert(quizStatement.data.statement.result.success === true, 'Success = true');
  assert(
    quizStatement.data.statement.tenant_id === tenant1Id,
    'tenant_id automatiquement injecte'
  );

  // Enregistrer un 2e statement (initialized)
  const initStatement = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/initialized',
      display: { 'fr-HT': 'a initialise' },
    },
    object: {
      id: 'https://tegs-learning.edu.ht/activities/module-sciences-201',
      objectType: 'Activity',
      definition: {
        name: { 'fr-HT': 'Module Sciences 201' },
      },
    },
  }, student1Token);
  assert(initStatement.status === 201, 'Statement initialized cree (201)');

  // Enregistrer un statement pour ecole 2 (admin2)
  const school2Statement = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'fr-HT': 'a termine' },
    },
    object: {
      id: 'https://tegs-learning.edu.ht/activities/cours-francais-301',
      objectType: 'Activity',
      definition: {
        name: { 'fr-HT': 'Cours Francais 301' },
      },
    },
    result: {
      completion: true,
    },
  }, admin2Token);
  assert(school2Statement.status === 201, 'Statement Ecole 2 cree (201)');

  // -----------------------------------------------------------------------
  // 2. Rejet de statements mal formes
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Rejet de statements mal formes ---');

  // Verbe manquant
  const noVerb = await request('POST', '/xapi/statements', {
    object: {
      id: 'https://tegs-learning.edu.ht/activities/quiz-1',
    },
  }, student1Token);
  assert(noVerb.status === 400, 'Statement sans verbe rejete (400)');

  // Object manquant
  const noObject = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'fr-HT': 'a termine' },
    },
  }, student1Token);
  assert(noObject.status === 400, 'Statement sans object rejete (400)');

  // Verbe invalide (pas dans la liste xAPI)
  const badVerb = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://fake.verb/invalid',
      display: { 'fr-HT': 'invalide' },
    },
    object: {
      id: 'https://tegs-learning.edu.ht/activities/quiz-1',
    },
  }, student1Token);
  assert(badVerb.status === 400, 'Statement avec verbe invalide rejete (400)');

  // verb.display manquant
  const noDisplay = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
    },
    object: {
      id: 'https://tegs-learning.edu.ht/activities/quiz-1',
    },
  }, student1Token);
  assert(noDisplay.status === 400, 'Statement sans verb.display rejete (400)');

  // Sans token (non authentifie)
  const noAuth = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'fr-HT': 'a termine' },
    },
    object: {
      id: 'https://tegs-learning.edu.ht/activities/quiz-1',
    },
  });
  assert(noAuth.status === 401, 'Statement sans authentification rejete (401)');

  // -----------------------------------------------------------------------
  // 3. Recuperation des statements (GET)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Recuperation des statements ---');

  // Admin ecole 1 voit les traces de son ecole
  const getAdmin1 = await request('GET', '/xapi/statements', null, admin1Token);
  assert(getAdmin1.status === 200, 'Admin Ecole 1 peut lire les statements');
  assert(getAdmin1.data.count === 2, 'Admin Ecole 1 voit 2 statements (quiz + init)');

  // Verifier que tous les statements appartiennent au tenant 1
  const allTenant1 = getAdmin1.data.statements.every(
    (s) => s.tenant_id === tenant1Id
  );
  assert(allTenant1, 'TOUS les statements retournes appartiennent a Ecole 1');

  // Student ne voit que ses propres traces
  const getStudent1 = await request('GET', '/xapi/statements', null, student1Token);
  assert(getStudent1.status === 200, 'Student Ecole 1 peut lire ses statements');
  assert(getStudent1.data.count === 2, 'Student voit ses 2 statements');
  const allStudent1 = getStudent1.data.statements.every(
    (s) => s.actor.user_id === student1Id
  );
  assert(allStudent1, 'Student ne voit que SES propres traces');

  // Filtrage par verbe
  const getByVerb = await request(
    'GET',
    '/xapi/statements?verb=http://adlnet.gov/expapi/verbs/passed',
    null,
    admin1Token
  );
  assert(getByVerb.status === 200, 'Filtrage par verbe fonctionne');
  assert(getByVerb.data.count === 1, 'Un seul statement "passed" dans Ecole 1');

  // Filtrage par activite
  const getByActivity = await request(
    'GET',
    '/xapi/statements?activity=https://tegs-learning.edu.ht/activities/quiz-math-101',
    null,
    admin1Token
  );
  assert(getByActivity.status === 200, 'Filtrage par activite fonctionne');
  assert(getByActivity.data.count === 1, 'Un seul statement pour quiz-math-101');

  // -----------------------------------------------------------------------
  // 4. TEST CRITIQUE : Isolation Multi-Tenant des Statements
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : ISOLATION MULTI-TENANT DES STATEMENTS (CRITIQUE) ---');

  // Admin ecole 2 recupere ses statements
  const getAdmin2 = await request('GET', '/xapi/statements', null, admin2Token);
  assert(getAdmin2.status === 200, 'Admin Ecole 2 peut lire les statements');
  assert(getAdmin2.data.count === 1, 'Admin Ecole 2 voit 1 statement');

  // Verifier que l'admin ecole 2 ne voit PAS les traces de ecole 1
  const allTenant2 = getAdmin2.data.statements.every(
    (s) => s.tenant_id === tenant2Id
  );
  assert(allTenant2, 'Admin Ecole 2 ne voit QUE les statements de son ecole');

  const noLeakTo2 = getAdmin2.data.statements.every(
    (s) => s.tenant_id !== tenant1Id
  );
  assert(noLeakTo2, 'AUCUNE fuite : Ecole 2 ne voit AUCUNE trace de Ecole 1');

  // Verification inverse : ecole 1 ne voit pas les traces d'ecole 2
  const noLeakTo1 = getAdmin1.data.statements.every(
    (s) => s.tenant_id !== tenant2Id
  );
  assert(noLeakTo1, 'AUCUNE fuite : Ecole 1 ne voit AUCUNE trace de Ecole 2');

  // -----------------------------------------------------------------------
  // 5. Zero Regression Sprint 1
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : Zero Regression Sprint 1 ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health check toujours OK');

  // Login fonctionne toujours
  const login = await request('POST', '/auth/login', {
    email: 'admin-xapi@ouanaminthe.edu.ht',
    password: 'Admin123!',
    tenant_id: tenant1Id,
  });
  assert(login.status === 200, 'Login Sprint 1 fonctionne toujours');

  // /me fonctionne toujours
  const me = await request('GET', '/auth/me', null, login.data.token);
  assert(me.status === 200, 'Route /me Sprint 1 fonctionne toujours');
  assert(me.data.user.tenant_id === tenant1Id, '/me retourne le bon tenant_id');

  // Liste users isolee fonctionne toujours
  const users = await request('GET', '/users', null, login.data.token);
  assert(users.status === 200, 'Liste users Sprint 1 fonctionne toujours');

  // -----------------------------------------------------------------------
  // Resultat final
  // -----------------------------------------------------------------------
  console.log('\n========================================');
  console.log(`  RESULTATS : ${passed} PASS / ${failed} FAIL sur ${passed + failed} tests`);
  console.log('========================================');

  if (failed > 0) {
    console.log('\n  [ECHEC] Des tests ont echoue. Verifiez les erreurs ci-dessus.');
    process.exit(1);
  } else {
    console.log('\n  [SUCCES] Sprint 2 valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  console.error('Assurez-vous que le backend est demarre (npm run dev) et MongoDB accessible.');
  process.exit(1);
});
