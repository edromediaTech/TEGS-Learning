/**
 * TEGS-Learning - Sprint 5 : Test cmi5 Launch Service & XML Manifest
 *
 * Ce script prouve que :
 * 1. Le generateur produit un cmi5.xml valide (structure, AUs, balises)
 * 2. Le manifeste JSON retourne la bonne structure de cours
 * 3. Le launch service genere une URL avec tous les parametres cmi5
 * 4. Le fetch endpoint retourne les donnees de session (auth-token, endpoint)
 * 5. Le fetch ne peut etre consomme qu'une seule fois
 * 6. Le player HTML est accessible via l'URL de lancement
 * 7. Isolation multi-tenant sur les manifestes et lancements
 * 8. Zero regression Sprints 1-4
 *
 * Pre-requis : MongoDB + backend demarre
 * Usage : node test-cmi5.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';

async function request(method, path, body, token) {
  const url = `${BASE_URL}${path}`;
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
  } else {
    data = await res.json();
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
  console.log('=== TEGS-Learning | Sprint 5 - Tests cmi5 Launch & Manifest ===\n');

  // -----------------------------------------------------------------------
  // 0. Setup
  // -----------------------------------------------------------------------
  console.log('--- Setup ---');

  const school1 = await request('POST', '/tenants', {
    name: 'Ecole cmi5 Cap-Haitien',
    code: 'CMI5-CAP-001',
    address: 'Cap-Haitien, Nord',
  });
  assert(school1.status === 201, 'Ecole 1 creee');
  const t1 = school1.data.tenant._id;

  const school2 = await request('POST', '/tenants', {
    name: 'Ecole cmi5 Hinche',
    code: 'CMI5-HIN-001',
    address: 'Hinche, Centre',
  });
  assert(school2.status === 201, 'Ecole 2 creee');
  const t2 = school2.data.tenant._id;

  const admin1 = await request('POST', '/auth/register', {
    email: 'admin-cmi5@cap.edu.ht',
    password: 'Admin123!',
    firstName: 'Jean',
    lastName: 'Pierre',
    role: 'admin_ddene',
    tenant_id: t1,
  });
  assert(admin1.status === 201, 'Admin Ecole 1 cree');
  const tok1 = admin1.data.token;

  const student1 = await request('POST', '/auth/register', {
    email: 'eleve-cmi5@cap.edu.ht',
    password: 'Stud123!',
    firstName: 'Marie',
    lastName: 'Joseph',
    role: 'student',
    tenant_id: t1,
  });
  assert(student1.status === 201, 'Student Ecole 1 cree');
  const tokStudent = student1.data.token;

  const admin2 = await request('POST', '/auth/register', {
    email: 'admin-cmi5@hinche.edu.ht',
    password: 'Admin456!',
    firstName: 'Rose',
    lastName: 'Marie',
    role: 'admin_ddene',
    tenant_id: t2,
  });
  assert(admin2.status === 201, 'Admin Ecole 2 cree');
  const tok2 = admin2.data.token;

  // Creer un module avec structure et contenu
  const mod = await request('POST', '/modules', {
    title: 'Sciences Naturelles CM1',
    description: 'Cours de sciences pour le CM1',
    language: 'fr',
  }, tok1);
  assert(mod.status === 201, 'Module cree');
  const moduleId = mod.data.module._id;

  const struct = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [
      {
        title: 'Chapitre 1 : Le corps humain',
        screens: [
          { title: 'Les organes' },
          { title: 'Quiz: Le corps' },
        ],
      },
      {
        title: 'Chapitre 2 : Les plantes',
        screens: [
          { title: 'Photosynthese' },
        ],
      },
    ],
  }, tok1);
  assert(struct.status === 200, 'Structure creee (2 chapitres, 3 ecrans)');

  const s1 = struct.data.module.sections[0];
  const s2 = struct.data.module.sections[1];
  const screen1Id = s1.screens[0]._id;
  const screen2Id = s1.screens[1]._id;
  const screen3Id = s2.screens[0]._id;

  // -----------------------------------------------------------------------
  // 1. Generation du manifeste cmi5.xml
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Manifeste cmi5.xml ---');

  const xmlRes = await request('GET', `/cmi5/manifest/${moduleId}`, null, tok1);
  assert(xmlRes.status === 200, 'cmi5.xml genere (200)');
  assert(xmlRes.contentType.includes('xml'), 'Content-Type = application/xml');

  const xml = xmlRes.data;
  assert(xml.includes('<?xml version="1.0"'), 'Declaration XML presente');
  assert(xml.includes('<courseStructure'), 'Balise courseStructure presente');
  assert(xml.includes('<course id="'), 'Balise course presente');
  assert(xml.includes('Sciences Naturelles CM1'), 'Titre du cours dans le XML');
  assert(xml.includes('<block id="'), 'Balises block presentes');
  assert(xml.includes('<au id="'), 'Balises AU presentes');
  assert(xml.includes('moveOn="CompletedOrPassed"'), 'Attribut moveOn present');
  assert(xml.includes('launchMethod="AnyWindow"'), 'Attribut launchMethod present');
  assert(xml.includes('<url>'), 'URLs de lancement presentes');
  assert(xml.includes('</courseStructure>'), 'Balise fermante courseStructure');

  // Compter les AUs (3 ecrans = 3 AUs)
  const auCount = (xml.match(/<au /g) || []).length;
  assert(auCount === 3, `3 AUs dans le XML (trouve: ${auCount})`);

  // Compter les blocks (2 sections = 2 blocks)
  const blockCount = (xml.match(/<block /g) || []).length;
  assert(blockCount === 2, `2 blocks dans le XML (trouve: ${blockCount})`);

  // Verifier les langstrings
  assert(xml.includes('lang="fr"'), 'Attribut lang="fr" present');

  // -----------------------------------------------------------------------
  // 2. Manifeste JSON
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Manifeste JSON ---');

  const jsonRes = await request('GET', `/cmi5/manifest/${moduleId}/json`, null, tok1);
  assert(jsonRes.status === 200, 'Manifeste JSON genere (200)');
  assert(jsonRes.data.courseId.includes(moduleId), 'courseId contient le module ID');
  assert(jsonRes.data.title === 'Sciences Naturelles CM1', 'Titre correct');
  assert(jsonRes.data.blocks.length === 2, '2 blocks');
  assert(jsonRes.data.blocks[0].aus.length === 2, 'Block 1 a 2 AUs');
  assert(jsonRes.data.blocks[1].aus.length === 1, 'Block 2 a 1 AU');
  assert(jsonRes.data.blocks[0].aus[0].moveOn === 'CompletedOrPassed', 'moveOn correct');
  assert(jsonRes.data.blocks[0].aus[0].url.includes('/player/'), 'URL player dans AU');

  // -----------------------------------------------------------------------
  // 3. Launch Service - Generation d'URL de lancement
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Launch Service ---');

  const launch = await request('POST', `/cmi5/launch/${moduleId}/${screen1Id}`, {
    masteryScore: 0.8,
  }, tokStudent);
  assert(launch.status === 201, 'Session de lancement creee (201)');
  assert(!!launch.data.launchUrl, 'launchUrl generee');
  assert(!!launch.data.token, 'Token de session genere');
  assert(!!launch.data.registration, 'Registration ID genere');
  assert(!!launch.data.expiresAt, 'Expiration definie');

  const launchUrl = launch.data.launchUrl;
  assert(launchUrl.includes('endpoint='), 'Param endpoint dans launchUrl');
  assert(launchUrl.includes('fetch='), 'Param fetch dans launchUrl');
  assert(launchUrl.includes('registration='), 'Param registration dans launchUrl');
  assert(launchUrl.includes('activityId='), 'Param activityId dans launchUrl');
  assert(launchUrl.includes('actor='), 'Param actor dans launchUrl');

  // Verifier que l'acteur contient le nom
  const actorParam = decodeURIComponent(launchUrl.split('actor=')[1]);
  const actor = JSON.parse(actorParam);
  assert(actor.name === 'Marie Joseph', 'Actor name correct');
  assert(actor.mbox === 'mailto:eleve-cmi5@cap.edu.ht', 'Actor mbox correct');
  assert(actor.objectType === 'Agent', 'Actor objectType = Agent');

  // -----------------------------------------------------------------------
  // 4. Fetch endpoint - Recuperation des donnees de session
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Fetch endpoint cmi5 ---');

  const fetchToken = launch.data.token;

  const fetchRes = await request('POST', `/cmi5/fetch/${fetchToken}`);
  assert(fetchRes.status === 200, 'Fetch reussi (200)');
  assert(fetchRes.data['auth-token'] === fetchToken, 'auth-token retourne');
  assert(fetchRes.data.endpoint.includes('/api/xapi'), 'Endpoint LRS retourne');
  assert(!!fetchRes.data.registration, 'Registration retourne');
  assert(!!fetchRes.data.activityId, 'ActivityId retourne');
  assert(fetchRes.data.launchData.launchMode === 'Normal', 'launchMode = Normal');
  assert(fetchRes.data.launchData.masteryScore === 0.8, 'masteryScore = 0.8');

  // -----------------------------------------------------------------------
  // 5. Fetch unique (ne peut etre consomme qu'une fois)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : Fetch unique ---');

  const fetchAgain = await request('POST', `/cmi5/fetch/${fetchToken}`);
  assert(fetchAgain.status === 409, 'Deuxieme fetch rejete (409 - deja consomme)');

  // Token inexistant
  const fetchBad = await request('POST', '/cmi5/fetch/invalid-token-xyz');
  assert(fetchBad.status === 404, 'Token invalide rejete (404)');

  // -----------------------------------------------------------------------
  // 6. Player HTML
  // -----------------------------------------------------------------------
  console.log('\n--- Test 6 : Player HTML ---');

  const playerRes = await request('GET', `/cmi5/player/${moduleId}/${screen1Id}?registration=test&activityId=test`);
  assert(playerRes.status === 200, 'Player HTML accessible (200)');
  assert(playerRes.contentType.includes('html'), 'Content-Type = text/html');
  assert(playerRes.data.includes('TEGS-Learning Player'), 'Titre du player present');
  assert(playerRes.data.includes('cmi5'), 'Reference cmi5 dans le player');

  // -----------------------------------------------------------------------
  // 7. Session status
  // -----------------------------------------------------------------------
  console.log('\n--- Test 7 : Session status ---');

  const sessionRes = await request('GET', `/cmi5/session/${launch.data.sessionId}`, null, tokStudent);
  assert(sessionRes.status === 200, 'Session recuperee (200)');
  assert(sessionRes.data.session.status === 'fetched', 'Status = fetched');
  assert(sessionRes.data.session.screen_id === screen1Id, 'screen_id correct');

  // -----------------------------------------------------------------------
  // 8. Isolation multi-tenant
  // -----------------------------------------------------------------------
  console.log('\n--- Test 8 : Isolation multi-tenant ---');

  const crossManifest = await request('GET', `/cmi5/manifest/${moduleId}`, null, tok2);
  assert(crossManifest.status === 404, 'Admin Ecole 2 ne peut pas voir manifeste Ecole 1 (404)');

  const crossJson = await request('GET', `/cmi5/manifest/${moduleId}/json`, null, tok2);
  assert(crossJson.status === 404, 'Admin Ecole 2 ne peut pas voir manifeste JSON Ecole 1 (404)');

  const crossLaunch = await request('POST', `/cmi5/launch/${moduleId}/${screen1Id}`, {}, tok2);
  assert(crossLaunch.status === 404, 'Admin Ecole 2 ne peut pas lancer contenu Ecole 1 (404)');

  // Student ne peut pas generer de manifeste (role insuffisant)
  const studentManifest = await request('GET', `/cmi5/manifest/${moduleId}`, null, tokStudent);
  assert(studentManifest.status === 403, 'Student ne peut pas generer de manifeste (403)');

  // -----------------------------------------------------------------------
  // 9. Zero regression Sprints 1-4
  // -----------------------------------------------------------------------
  console.log('\n--- Test 9 : Zero regression ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health check OK');

  const login = await request('POST', '/auth/login', {
    email: 'admin-cmi5@cap.edu.ht',
    password: 'Admin123!',
    tenant_id: t1,
  });
  assert(login.status === 200, 'Login Sprint 1 OK');

  const stmt = await request('POST', '/xapi/statements', {
    verb: { id: 'http://adlnet.gov/expapi/verbs/initialized', display: { 'fr-HT': 'a initialise' } },
    object: { id: 'https://tegs-learning.edu.ht/activities/test-sprint5' },
  }, tok1);
  assert(stmt.status === 201, 'xAPI Sprint 2 OK');

  const mods = await request('GET', '/modules', null, tok1);
  assert(mods.status === 200, 'Modules Sprint 3 OK');

  // Sprint 4 : sauvegarder du contenu
  const content = await request('PUT', `/modules/${moduleId}/screens/${screen1Id}/content`, {
    contentBlocks: [
      { type: 'text', order: 0, data: { content: 'Test regression Sprint 4' } },
    ],
  }, tok1);
  assert(content.status === 200, 'Content blocks Sprint 4 OK');

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
    console.log('\n  [SUCCES] Sprint 5 valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  console.error('Assurez-vous que le backend est demarre et MongoDB accessible.');
  process.exit(1);
});
