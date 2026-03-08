/**
 * TEGS-Learning - Sprint 6 : Test Runtime Tracking JS
 *
 * Ce script prouve que :
 * 1. Le runtime JS est accessible via /public/js/tegs-runtime.js
 * 2. Le flux complet cmi5 fonctionne : launch -> fetch -> initialize -> experienced -> passed/failed -> completed -> terminated
 * 3. Les statements xAPI sont crees en base avec le bon tenant_id et les bons scores
 * 4. La session est bien marquee comme terminated apres fermeture
 * 5. L'etat (bookmark) peut etre sauvegarde et restaure
 * 6. Le player HTML charge le runtime et le contenu
 * 7. Isolation multi-tenant sur le tracking
 * 8. Zero regression Sprints 1-5
 *
 * Pre-requis : MongoDB + backend demarre
 * Usage : node test-runtime.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const PUBLIC_URL = process.env.BASE_URL
  ? process.env.BASE_URL.replace('/api', '')
  : 'http://localhost:3000';

async function request(method, path, body, token) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('xml')) {
    data = await res.text();
  } else if (contentType.includes('html')) {
    data = await res.text();
  } else if (contentType.includes('javascript')) {
    data = await res.text();
  } else {
    data = await res.json().catch(() => null);
  }
  return { status: res.status, data, contentType };
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
  console.log('=== TEGS-Learning | Sprint 6 - Tests Runtime Tracking JS ===\n');

  // Suffixe unique pour eviter les conflits avec les runs precedents
  const uid = Date.now().toString(36);

  // -----------------------------------------------------------------------
  // 0. Setup : Ecole de Ouanaminthe, admin, eleve, module avec quiz
  // -----------------------------------------------------------------------
  console.log('--- Setup ---');

  const school = await request('POST', '/tenants', {
    name: 'Ecole Runtime Ouanaminthe',
    code: `RT-OUA-${uid}`,
    address: 'Ouanaminthe, Nord-Est',
  });
  assert(school.status === 201, 'Ecole Ouanaminthe creee');
  const tenantId = school.data.tenant._id;

  const admin = await request('POST', '/auth/register', {
    email: `admin-rt-${uid}@ouanaminthe.edu.ht`,
    password: 'Admin123!',
    firstName: 'Pierre',
    lastName: 'Louis',
    role: 'admin_ddene',
    tenant_id: tenantId,
  });
  assert(admin.status === 201, 'Admin cree');
  const tokAdmin = admin.data.token;

  const student = await request('POST', '/auth/register', {
    email: `eleve-rt-${uid}@ouanaminthe.edu.ht`,
    password: 'Stud123!',
    firstName: 'Jacques',
    lastName: 'Bien-Aime',
    role: 'student',
    tenant_id: tenantId,
  });
  assert(student.status === 201, 'Eleve cree');
  const tokStudent = student.data.token;
  const studentUserId = student.data.user._id;

  // Ecole 2 pour isolation
  const school2 = await request('POST', '/tenants', {
    name: 'Ecole Runtime Jacmel',
    code: `RT-JAC-${uid}`,
    address: 'Jacmel, Sud-Est',
  });
  assert(school2.status === 201, 'Ecole 2 creee');
  const t2 = school2.data.tenant._id;

  const student2 = await request('POST', '/auth/register', {
    email: `eleve-rt-${uid}@jacmel.edu.ht`,
    password: 'Stud456!',
    firstName: 'Marie',
    lastName: 'Celestin',
    role: 'student',
    tenant_id: t2,
  });
  assert(student2.status === 201, 'Eleve 2 cree');
  const tokStudent2 = student2.data.token;

  // Creer un module avec contenu et quiz
  const mod = await request('POST', '/modules', {
    title: 'Mathematiques CE2',
    description: 'Cours de math CE2',
    language: 'fr',
  }, tokAdmin);
  assert(mod.status === 201, 'Module cree');
  const moduleId = mod.data.module._id;

  const struct = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [
      {
        title: 'Chapitre 1 : Les nombres',
        screens: [
          { title: 'Les nombres de 1 a 100' },
          { title: 'Quiz: Les nombres' },
        ],
      },
    ],
  }, tokAdmin);
  assert(struct.status === 200, 'Structure creee');

  const section = struct.data.module.sections[0];
  const screen1Id = section.screens[0]._id;
  const screen2Id = section.screens[1]._id;

  // Ajouter du contenu texte au premier ecran
  const content1 = await request('PUT', `/modules/${moduleId}/screens/${screen1Id}/content`, {
    contentBlocks: [
      { type: 'text', order: 0, data: { content: 'Les nombres entiers de 1 a 100 sont la base des mathematiques.' } },
    ],
  }, tokAdmin);
  assert(content1.status === 200, 'Contenu ecran 1 sauve');

  // Ajouter un quiz au deuxieme ecran
  const content2 = await request('PUT', `/modules/${moduleId}/screens/${screen2Id}/content`, {
    contentBlocks: [
      {
        type: 'quiz', order: 0, data: {
          question: 'Combien font 7 + 8 ?',
          options: ['13', '14', '15', '16'],
          correctIndex: 2,
          explanation: '7 + 8 = 15',
        },
      },
    ],
  }, tokAdmin);
  assert(content2.status === 200, 'Quiz ecran 2 sauve');

  // -----------------------------------------------------------------------
  // 1. Runtime JS accessible
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Runtime JS accessible ---');

  const rtJs = await request('GET', `${PUBLIC_URL}/public/js/tegs-runtime.js`);
  assert(rtJs.status === 200, 'tegs-runtime.js accessible (200)');
  assert(rtJs.data.includes('TEGSRuntime'), 'Contient la classe TEGSRuntime');
  assert(rtJs.data.includes('initialize'), 'Contient la methode initialize');
  assert(rtJs.data.includes('terminated'), 'Contient la logique terminated');
  assert(rtJs.data.includes('TEGS_VERBS'), 'Exporte TEGS_VERBS');

  // -----------------------------------------------------------------------
  // 2. Flux complet cmi5 : launch -> fetch -> statements
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Flux complet cmi5 tracking ---');

  // 2a. Launch
  const launch = await request('POST', `/cmi5/launch/${moduleId}/${screen1Id}`, {
    masteryScore: 0.7,
  }, tokStudent);
  assert(launch.status === 201, 'Session lancee (201)');
  const sessionId = launch.data.sessionId;
  const fetchToken = launch.data.token;
  const registration = launch.data.registration;

  // 2b. Fetch
  const fetchRes = await request('POST', `/cmi5/fetch/${fetchToken}`);
  assert(fetchRes.status === 200, 'Fetch reussi (200)');
  const authToken = fetchRes.data['auth-token'];
  const lrsEndpoint = fetchRes.data.endpoint;
  const activityId = fetchRes.data.activityId;

  // 2c. Send Initialized
  const initStmt = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/initialized',
      display: { 'fr-HT': 'a initialise' },
    },
    object: { id: activityId },
    context: {
      registration: registration,
      extensions: {
        'https://tegs-learning.edu.ht/ext/session_id': sessionId,
      },
    },
  }, tokStudent);
  assert(initStmt.status === 201, 'Statement Initialized cree (201)');
  assert(initStmt.data.statement.verb.id === 'http://adlnet.gov/expapi/verbs/initialized', 'Verb = initialized');

  // 2d. Update session to launched
  const launchStatus = await request('PUT', `/cmi5/session/${sessionId}/status`, {
    status: 'launched',
  }, tokStudent);
  assert(launchStatus.status === 200, 'Session marquee launched');

  // 2e. Send Experienced (navigation)
  const expStmt = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/experienced',
      display: { 'fr-HT': 'a consulte' },
    },
    object: {
      id: activityId,
      definition: {
        name: { 'fr-HT': 'Les nombres de 1 a 100' },
        type: 'http://adlnet.gov/expapi/activities/media',
      },
    },
    context: {
      registration: registration,
      extensions: {
        'https://tegs-learning.edu.ht/ext/session_id': sessionId,
      },
    },
  }, tokStudent);
  assert(expStmt.status === 201, 'Statement Experienced cree (201)');

  // 2f. Send Passed avec score (quiz reussi)
  const passStmt = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/passed',
      display: { 'fr-HT': 'a reussi' },
    },
    object: { id: activityId },
    result: {
      score: { scaled: 1.0, raw: 100, min: 0, max: 100 },
      success: true,
      completion: true,
    },
    context: {
      registration: registration,
      extensions: {
        'https://tegs-learning.edu.ht/ext/session_id': sessionId,
      },
    },
  }, tokStudent);
  assert(passStmt.status === 201, 'Statement Passed cree (201)');
  assert(passStmt.data.statement.result.score.scaled === 1.0, 'Score scaled = 1.0');
  assert(passStmt.data.statement.result.success === true, 'success = true');

  // 2g. Send Completed
  const compStmt = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'fr-HT': 'a termine' },
    },
    object: { id: activityId },
    result: { completion: true, duration: 'PT120S' },
    context: {
      registration: registration,
      extensions: {
        'https://tegs-learning.edu.ht/ext/session_id': sessionId,
      },
    },
  }, tokStudent);
  assert(compStmt.status === 201, 'Statement Completed cree (201)');
  assert(compStmt.data.statement.result.completion === true, 'completion = true');

  // Update session to completed
  const compStatus = await request('PUT', `/cmi5/session/${sessionId}/status`, {
    status: 'completed',
  }, tokStudent);
  assert(compStatus.status === 200, 'Session marquee completed');

  // 2h. Send Terminated
  const termStmt = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/terminated',
      display: { 'fr-HT': 'a mis fin' },
    },
    object: { id: activityId },
    result: { duration: 'PT125S' },
    context: {
      registration: registration,
      extensions: {
        'https://tegs-learning.edu.ht/ext/session_id': sessionId,
      },
    },
  }, tokStudent);
  assert(termStmt.status === 201, 'Statement Terminated cree (201)');

  // Update session to terminated
  const termStatus = await request('PUT', `/cmi5/session/${sessionId}/status`, {
    status: 'terminated',
  }, tokStudent);
  assert(termStatus.status === 200, 'Session marquee terminated');

  // -----------------------------------------------------------------------
  // 3. Verification en base : statements xAPI avec bon tenant_id
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Verification statements en base ---');

  const stmts = await request('GET', `/xapi/statements?activity=${encodeURIComponent(activityId)}`, null, tokStudent);
  assert(stmts.status === 200, 'Statements recuperes');
  assert(stmts.data.count >= 5, `Au moins 5 statements (trouve: ${stmts.data.count})`);

  // Verifier les verbes presents
  const verbIds = stmts.data.statements.map(s => s.verb.id);
  assert(verbIds.includes('http://adlnet.gov/expapi/verbs/initialized'), 'Initialized present en base');
  assert(verbIds.includes('http://adlnet.gov/expapi/verbs/experienced'), 'Experienced present en base');
  assert(verbIds.includes('http://adlnet.gov/expapi/verbs/passed'), 'Passed present en base');
  assert(verbIds.includes('http://adlnet.gov/expapi/verbs/completed'), 'Completed present en base');
  assert(verbIds.includes('http://adlnet.gov/expapi/verbs/terminated'), 'Terminated present en base');

  // Verifier tenant_id sur tous les statements
  const allSameTenant = stmts.data.statements.every(s => s.tenant_id === tenantId);
  assert(allSameTenant, 'Tous les statements ont le bon tenant_id');

  // Verifier le score du Passed
  const passedStmt = stmts.data.statements.find(s => s.verb.id.includes('passed'));
  assert(passedStmt.result.score.scaled === 1.0, 'Score Passed en base = 1.0');
  assert(passedStmt.result.success === true, 'Success Passed en base = true');

  // Verifier registration sur tous
  const allSameReg = stmts.data.statements.every(s => s.context && s.context.registration === registration);
  assert(allSameReg, 'Tous les statements ont le bon registration');

  // -----------------------------------------------------------------------
  // 4. Session finale marquee terminated
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Session terminee ---');

  const sessionCheck = await request('GET', `/cmi5/session/${sessionId}`, null, tokStudent);
  assert(sessionCheck.status === 200, 'Session recuperee');
  assert(sessionCheck.data.session.status === 'terminated', 'Session status = terminated');

  // -----------------------------------------------------------------------
  // 5. Flux echec : quiz echoue (Failed)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : Flux quiz Failed ---');

  const launch2 = await request('POST', `/cmi5/launch/${moduleId}/${screen2Id}`, {
    masteryScore: 0.7,
  }, tokStudent);
  assert(launch2.status === 201, 'Session 2 lancee');
  const session2Id = launch2.data.sessionId;
  const reg2 = launch2.data.registration;

  const fetch2 = await request('POST', `/cmi5/fetch/${launch2.data.token}`);
  assert(fetch2.status === 200, 'Fetch 2 reussi');
  const activity2 = fetch2.data.activityId;

  // Initialized
  await request('POST', '/xapi/statements', {
    verb: { id: 'http://adlnet.gov/expapi/verbs/initialized', display: { 'fr-HT': 'a initialise' } },
    object: { id: activity2 },
    context: { registration: reg2 },
  }, tokStudent);

  // Failed avec score 0.3
  const failStmt = await request('POST', '/xapi/statements', {
    verb: { id: 'http://adlnet.gov/expapi/verbs/failed', display: { 'fr-HT': 'a echoue' } },
    object: { id: activity2 },
    result: {
      score: { scaled: 0.3, raw: 30, min: 0, max: 100 },
      success: false,
      completion: true,
    },
    context: { registration: reg2 },
  }, tokStudent);
  assert(failStmt.status === 201, 'Statement Failed cree (201)');
  assert(failStmt.data.statement.result.score.scaled === 0.3, 'Score Failed = 0.3');
  assert(failStmt.data.statement.result.success === false, 'success = false');

  // Terminated
  await request('POST', '/xapi/statements', {
    verb: { id: 'http://adlnet.gov/expapi/verbs/terminated', display: { 'fr-HT': 'a mis fin' } },
    object: { id: activity2 },
    context: { registration: reg2 },
  }, tokStudent);

  await request('PUT', `/cmi5/session/${session2Id}/status`, { status: 'terminated' }, tokStudent);

  const session2Check = await request('GET', `/cmi5/session/${session2Id}`, null, tokStudent);
  assert(session2Check.data.session.status === 'terminated', 'Session 2 terminated apres echec');

  // -----------------------------------------------------------------------
  // 6. State API (Bookmark)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 6 : State API (bookmark) ---');

  // Nouvelle session pour tester le state
  const launch3 = await request('POST', `/cmi5/launch/${moduleId}/${screen1Id}`, {}, tokStudent);
  assert(launch3.status === 201, 'Session 3 lancee');
  const session3Id = launch3.data.sessionId;

  // Consommer le fetch
  await request('POST', `/cmi5/fetch/${launch3.data.token}`);

  // Sauvegarder le bookmark
  const saveState = await request('PUT', `/cmi5/state/${session3Id}`, {
    currentScreenId: screen2Id,
    currentScreenTitle: 'Quiz: Les nombres',
    progress: 0.5,
  }, tokStudent);
  assert(saveState.status === 200, 'State sauvegarde (200)');

  // Restaurer le bookmark
  const getState = await request('GET', `/cmi5/state/${session3Id}`, null, tokStudent);
  assert(getState.status === 200, 'State restaure (200)');
  assert(getState.data.currentScreenId === screen2Id, 'currentScreenId correct');
  assert(getState.data.progress === 0.5, 'progress = 0.5');

  // -----------------------------------------------------------------------
  // 7. Player HTML avec runtime
  // -----------------------------------------------------------------------
  console.log('\n--- Test 7 : Player HTML avec runtime ---');

  const playerRes = await request('GET', `/cmi5/player/${moduleId}/${screen1Id}?registration=test&activityId=test&sessionId=test`);
  assert(playerRes.status === 200, 'Player HTML accessible (200)');
  assert(playerRes.data.includes('tegs-runtime.js'), 'Player charge tegs-runtime.js');
  assert(playerRes.data.includes('TEGSRuntime'), 'Player instancie TEGSRuntime');
  assert(playerRes.data.includes('runtime.initialize'), 'Player appelle initialize()');
  assert(playerRes.data.includes('runtime.experienced'), 'Player appelle experienced()');
  assert(playerRes.data.includes('runtime.passed'), 'Player gere passed()');
  assert(playerRes.data.includes('runtime.failed'), 'Player gere failed()');
  assert(playerRes.data.includes('runtime.completed'), 'Player gere completed()');
  assert(playerRes.data.includes('runtime.terminate'), 'Player gere terminate()');
  assert(playerRes.data.includes('handleComplete'), 'Bouton Terminer present');
  assert(playerRes.data.includes('handleClose'), 'Bouton Fermer present');
  assert(playerRes.data.includes('sendBeacon'), 'sendBeacon pour beforeunload');

  // -----------------------------------------------------------------------
  // 8. Isolation multi-tenant tracking
  // -----------------------------------------------------------------------
  console.log('\n--- Test 8 : Isolation multi-tenant tracking ---');

  // Eleve 2 (Jacmel) ne peut pas lancer le module de Ouanaminthe
  const crossLaunch = await request('POST', `/cmi5/launch/${moduleId}/${screen1Id}`, {}, tokStudent2);
  assert(crossLaunch.status === 404, 'Eleve Jacmel ne peut pas lancer module Ouanaminthe (404)');

  // Eleve 2 ne peut pas voir les statements de Ouanaminthe
  const crossStmts = await request('GET', `/xapi/statements?activity=${encodeURIComponent(activityId)}`, null, tokStudent2);
  assert(crossStmts.status === 200, 'Requete statements OK');
  assert(crossStmts.data.count === 0, 'Eleve Jacmel voit 0 statements Ouanaminthe');

  // Eleve 2 ne peut pas mettre a jour la session de Ouanaminthe
  const crossStatus = await request('PUT', `/cmi5/session/${sessionId}/status`, { status: 'terminated' }, tokStudent2);
  assert(crossStatus.status === 404, 'Eleve Jacmel ne peut pas modifier session Ouanaminthe (404)');

  // Eleve 2 ne peut pas acceder au state de Ouanaminthe
  const crossState = await request('GET', `/cmi5/state/${session3Id}`, null, tokStudent2);
  assert(crossState.status === 404, 'Eleve Jacmel ne peut pas lire state Ouanaminthe (404)');

  // -----------------------------------------------------------------------
  // 9. Session status invalide
  // -----------------------------------------------------------------------
  console.log('\n--- Test 9 : Validations ---');

  // Status invalide
  const badStatus = await request('PUT', `/cmi5/session/${session3Id}/status`, { status: 'invalid' }, tokStudent);
  assert(badStatus.status === 400, 'Status invalide rejete (400)');

  // Verifier que le verb display est bien enregistre
  const verbCheck = await request('GET', `/xapi/statements?verb=${encodeURIComponent('http://adlnet.gov/expapi/verbs/passed')}`, null, tokStudent);
  assert(verbCheck.status === 200, 'Filtre par verb OK');
  assert(verbCheck.data.count >= 1, 'Au moins 1 statement Passed');

  // -----------------------------------------------------------------------
  // 10. Zero regression Sprints 1-5
  // -----------------------------------------------------------------------
  console.log('\n--- Test 10 : Zero regression ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health check OK');

  const login = await request('POST', '/auth/login', {
    email: `admin-rt-${uid}@ouanaminthe.edu.ht`,
    password: 'Admin123!',
    tenant_id: tenantId,
  });
  assert(login.status === 200, 'Login Sprint 1 OK');

  const stmtBasic = await request('POST', '/xapi/statements', {
    verb: { id: 'http://adlnet.gov/expapi/verbs/attempted', display: { 'fr-HT': 'a tente' } },
    object: { id: 'https://tegs-learning.edu.ht/activities/regression-s6' },
  }, tokAdmin);
  assert(stmtBasic.status === 201, 'xAPI Sprint 2 OK');

  const mods = await request('GET', '/modules', null, tokAdmin);
  assert(mods.status === 200, 'Modules Sprint 3 OK');

  const screenContent = await request('GET', `/modules/${moduleId}/screens/${screen1Id}`, null, tokAdmin);
  assert(screenContent.status === 200, 'Screen content Sprint 4 OK');

  const xmlRes = await request('GET', `/cmi5/manifest/${moduleId}`, null, tokAdmin);
  assert(xmlRes.status === 200, 'cmi5.xml Sprint 5 OK');

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
    console.log('\n  [SUCCES] Sprint 6 valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  console.error('Assurez-vous que le backend est demarre et MongoDB accessible.');
  process.exit(1);
});
