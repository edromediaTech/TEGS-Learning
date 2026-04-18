/**
 * TEGS-Learning - Sprint 4 : Script de Test Block Builder & Content
 *
 * Ce script prouve que :
 * 1. On peut creer un ecran "Introduction" avec un texte + une video
 * 2. On peut creer un ecran "Test" avec un quiz de 3 questions
 * 3. Les blocs sont persistes et recuperables via GET
 * 4. Les blocs mal formes sont rejetes (validation)
 * 5. Isolation multi-tenant sur le contenu des ecrans
 * 6. La structure preserve le contenu existant apres mise a jour
 * 7. Zero regression Sprint 1, 2, 3
 *
 * Pre-requis : MongoDB + backend demarre
 * Usage : node test-blocks.js
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
  console.log('=== TEGS-Learning | Sprint 4 - Tests Block Builder & Content ===\n');

  // -----------------------------------------------------------------------
  // 0. Setup
  // -----------------------------------------------------------------------
  console.log('--- Setup ---');

  const school1 = await request('POST', '/tenants', {
    name: 'Ecole Bloc-Test Limonade',
    code: 'BLK-LIM-001',
    address: 'Limonade, Nord',
  });
  assert(school1.status === 201, 'Ecole 1 creee');
  const t1 = school1.data.tenant._id;

  const school2 = await request('POST', '/tenants', {
    name: 'Ecole Bloc-Test Milot',
    code: 'BLK-MIL-001',
    address: 'Milot, Nord',
  });
  assert(school2.status === 201, 'Ecole 2 creee');
  const t2 = school2.data.tenant._id;

  const admin1 = await request('POST', '/auth/register', {
    email: 'admin-blk@limonade.edu.ht',
    password: 'Admin123!',
    firstName: 'Jean',
    lastName: 'Marc',
    role: 'admin_ddene',
    tenant_id: t1,
  });
  assert(admin1.status === 201, 'Admin Ecole 1 cree');
  const tok1 = admin1.data.token;

  const admin2 = await request('POST', '/auth/register', {
    email: 'admin-blk@milot.edu.ht',
    password: 'Admin456!',
    firstName: 'Marie',
    lastName: 'Rose',
    role: 'admin_ddene',
    tenant_id: t2,
  });
  assert(admin2.status === 201, 'Admin Ecole 2 cree');
  const tok2 = admin2.data.token;

  // Creer un module avec structure
  const mod = await request('POST', '/modules', {
    title: 'Francais - Introduction',
    description: 'Module de test pour le builder de blocs',
    language: 'fr',
  }, tok1);
  assert(mod.status === 201, 'Module cree');
  const moduleId = mod.data.module._id;

  const struct = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [
      {
        title: 'Chapitre 1 : Bienvenue',
        screens: [
          { title: 'Introduction' },
          { title: 'Test de connaissances' },
          { title: 'Ecran vide' },
        ],
      },
    ],
  }, tok1);
  assert(struct.status === 200, 'Structure creee (1 chapitre, 3 ecrans)');

  const screenIntro = struct.data.module.sections[0].screens[0]._id;
  const screenTest = struct.data.module.sections[0].screens[1]._id;
  const screenEmpty = struct.data.module.sections[0].screens[2]._id;

  // -----------------------------------------------------------------------
  // 1. Ecran "Introduction" : texte + video
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Ecran Introduction (texte + video) ---');

  const introContent = await request('PUT', `/modules/${moduleId}/screens/${screenIntro}/content`, {
    contentBlocks: [
      {
        type: 'text',
        order: 0,
        data: {
          content: '# Bienvenue dans le cours de Francais\n\nCe module vous apprendra les **bases** de la langue francaise.\n\n- Les voyelles\n- Les consonnes\n- Les syllabes',
        },
      },
      {
        type: 'media',
        order: 1,
        data: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          mediaType: 'video',
          caption: 'Video d\'introduction au cours',
        },
      },
    ],
  }, tok1);

  assert(introContent.status === 200, 'Contenu Introduction sauvegarde (200)');
  assert(introContent.data.screen.contentBlocks.length === 2, '2 blocs sauvegardes');
  assert(introContent.data.screen.contentBlocks[0].type === 'text', 'Bloc 1 = texte');
  assert(introContent.data.screen.contentBlocks[1].type === 'media', 'Bloc 2 = media');
  assert(
    introContent.data.screen.contentBlocks[1].data.mediaType === 'video',
    'Media type = video'
  );

  // -----------------------------------------------------------------------
  // 2. Ecran "Test" : 3 quiz
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Ecran Test (3 quiz) ---');

  const testContent = await request('PUT', `/modules/${moduleId}/screens/${screenTest}/content`, {
    contentBlocks: [
      {
        type: 'text',
        order: 0,
        data: { content: '## Test de connaissances\n\nRepondez aux questions suivantes :' },
      },
      {
        type: 'quiz',
        order: 1,
        data: {
          question: 'Combien de voyelles y a-t-il en francais ?',
          options: [
            { text: '4', isCorrect: false },
            { text: '5', isCorrect: false },
            { text: '6', isCorrect: true },
            { text: '7', isCorrect: false },
          ],
          explanation: 'Les 6 voyelles sont : A, E, I, O, U, Y',
        },
      },
      {
        type: 'quiz',
        order: 2,
        data: {
          question: 'Quel mot est un adjectif ?',
          options: [
            { text: 'Courir', isCorrect: false },
            { text: 'Beau', isCorrect: true },
            { text: 'Maison', isCorrect: false },
          ],
          explanation: 'Beau est un adjectif qualificatif.',
        },
      },
      {
        type: 'quiz',
        order: 3,
        data: {
          question: 'Comment dit-on "bonjour" en creole haitien ?',
          options: [
            { text: 'Bonjou', isCorrect: true },
            { text: 'Bonswa', isCorrect: false },
            { text: 'Mesi', isCorrect: false },
          ],
          explanation: 'Bonjou est la traduction de bonjour en creole.',
        },
      },
    ],
  }, tok1);

  assert(testContent.status === 200, 'Contenu Test sauvegarde (200)');
  assert(testContent.data.screen.contentBlocks.length === 4, '4 blocs (1 texte + 3 quiz)');

  const quizBlocks = testContent.data.screen.contentBlocks.filter(b => b.type === 'quiz');
  assert(quizBlocks.length === 3, '3 blocs quiz');
  assert(quizBlocks[0].data.options.length === 4, 'Quiz 1 a 4 options');
  assert(quizBlocks[1].data.options.some(o => o.isCorrect), 'Quiz 2 a une bonne reponse');

  // -----------------------------------------------------------------------
  // 3. Persistence : GET ecran avec contenu
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Persistence (GET ecran) ---');

  const getIntro = await request('GET', `/modules/${moduleId}/screens/${screenIntro}`, null, tok1);
  assert(getIntro.status === 200, 'GET ecran Introduction OK');
  assert(getIntro.data.screen.contentBlocks.length === 2, 'Contenu Introduction persiste (2 blocs)');
  assert(
    getIntro.data.screen.contentBlocks[0].data.content.includes('Bienvenue'),
    'Texte correct persiste'
  );
  assert(getIntro.data.sectionTitle === 'Chapitre 1 : Bienvenue', 'Section title retourne');
  assert(getIntro.data.moduleTitle === 'Francais - Introduction', 'Module title retourne');

  const getTest = await request('GET', `/modules/${moduleId}/screens/${screenTest}`, null, tok1);
  assert(getTest.status === 200, 'GET ecran Test OK');
  assert(getTest.data.screen.contentBlocks.length === 4, 'Contenu Test persiste (4 blocs)');

  // Ecran vide : 0 blocs
  const getEmpty = await request('GET', `/modules/${moduleId}/screens/${screenEmpty}`, null, tok1);
  assert(getEmpty.status === 200, 'GET ecran vide OK');
  assert(getEmpty.data.screen.contentBlocks.length === 0, 'Ecran vide = 0 blocs');

  // -----------------------------------------------------------------------
  // 4. Validation : blocs mal formes rejetes
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Validation des blocs ---');

  const noType = await request('PUT', `/modules/${moduleId}/screens/${screenEmpty}/content`, {
    contentBlocks: [{ data: { content: 'test' } }],
  }, tok1);
  assert(noType.status === 400, 'Bloc sans type rejete (400)');

  const badType = await request('PUT', `/modules/${moduleId}/screens/${screenEmpty}/content`, {
    contentBlocks: [{ type: 'invalid', order: 0, data: {} }],
  }, tok1);
  assert(badType.status === 400, 'Type invalide rejete (400)');

  const textNoContent = await request('PUT', `/modules/${moduleId}/screens/${screenEmpty}/content`, {
    contentBlocks: [{ type: 'text', order: 0, data: {} }],
  }, tok1);
  assert(textNoContent.status === 400, 'Bloc texte sans content rejete (400)');

  const mediaNoUrl = await request('PUT', `/modules/${moduleId}/screens/${screenEmpty}/content`, {
    contentBlocks: [{ type: 'media', order: 0, data: { mediaType: 'image' } }],
  }, tok1);
  assert(mediaNoUrl.status === 400, 'Bloc media sans URL rejete (400)');

  const mediaBadType = await request('PUT', `/modules/${moduleId}/screens/${screenEmpty}/content`, {
    contentBlocks: [{ type: 'media', order: 0, data: { url: 'http://test.com/img.png', mediaType: 'audio' } }],
  }, tok1);
  assert(mediaBadType.status === 400, 'Bloc media type audio rejete (400)');

  const quizNoQuestion = await request('PUT', `/modules/${moduleId}/screens/${screenEmpty}/content`, {
    contentBlocks: [{ type: 'quiz', order: 0, data: { options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] } }],
  }, tok1);
  assert(quizNoQuestion.status === 400, 'Quiz sans question rejete (400)');

  const quizOneOption = await request('PUT', `/modules/${moduleId}/screens/${screenEmpty}/content`, {
    contentBlocks: [{ type: 'quiz', order: 0, data: { question: 'Test?', options: [{ text: 'A', isCorrect: true }] } }],
  }, tok1);
  assert(quizOneOption.status === 400, 'Quiz avec 1 option rejete (400)');

  const quizNoCorrect = await request('PUT', `/modules/${moduleId}/screens/${screenEmpty}/content`, {
    contentBlocks: [{ type: 'quiz', order: 0, data: { question: 'Test?', options: [{ text: 'A', isCorrect: false }, { text: 'B', isCorrect: false }] } }],
  }, tok1);
  assert(quizNoCorrect.status === 400, 'Quiz sans bonne reponse rejete (400)');

  const notArray = await request('PUT', `/modules/${moduleId}/screens/${screenEmpty}/content`, {
    contentBlocks: 'pas un tableau',
  }, tok1);
  assert(notArray.status === 400, 'contentBlocks non-tableau rejete (400)');

  // -----------------------------------------------------------------------
  // 5. Isolation multi-tenant
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : Isolation multi-tenant ---');

  const crossGet = await request('GET', `/modules/${moduleId}/screens/${screenIntro}`, null, tok2);
  assert(crossGet.status === 404, 'Admin Ecole 2 ne peut pas lire ecran Ecole 1 (404)');

  const crossPut = await request('PUT', `/modules/${moduleId}/screens/${screenIntro}/content`, {
    contentBlocks: [{ type: 'text', order: 0, data: { content: 'pirate' } }],
  }, tok2);
  assert(crossPut.status === 404, 'Admin Ecole 2 ne peut pas modifier ecran Ecole 1 (404)');

  // -----------------------------------------------------------------------
  // 6. Structure update preserve le contenu existant
  // -----------------------------------------------------------------------
  console.log('\n--- Test 6 : Structure update preserve le contenu ---');

  // Recuperer le module complet avec les IDs
  const fullMod = await request('GET', `/modules/${moduleId}`, null, tok1);
  const currentSections = fullMod.data.module.sections;

  // Re-sauvegarder la structure en ajoutant un ecran, en preservant les _id
  const updatedStruct = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [
      {
        _id: currentSections[0]._id,
        title: 'Chapitre 1 : Bienvenue (modifie)',
        screens: [
          { _id: screenIntro, title: 'Introduction' },
          { _id: screenTest, title: 'Test de connaissances' },
          { _id: screenEmpty, title: 'Ecran vide' },
          { title: 'Nouvel ecran' },
        ],
      },
    ],
  }, tok1);
  assert(updatedStruct.status === 200, 'Structure mise a jour');
  assert(updatedStruct.data.module.sections[0].screens.length === 4, '4 ecrans apres ajout');

  // Verifier que le contenu de l'ecran Introduction est toujours la
  const getAfter = await request('GET', `/modules/${moduleId}/screens/${screenIntro}`, null, tok1);
  assert(getAfter.status === 200, 'Ecran Introduction toujours accessible');
  assert(
    getAfter.data.screen.contentBlocks.length === 2,
    'Contenu Introduction PRESERVE apres update structure (2 blocs)'
  );

  // -----------------------------------------------------------------------
  // 7. Zero regression Sprint 1, 2, 3
  // -----------------------------------------------------------------------
  console.log('\n--- Test 7 : Zero regression ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health check OK');

  const login = await request('POST', '/auth/login', {
    email: 'admin-blk@limonade.edu.ht',
    password: 'Admin123!',
    tenant_id: t1,
  });
  assert(login.status === 200, 'Login Sprint 1 OK');

  const stmt = await request('POST', '/xapi/statements', {
    verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'fr-HT': 'a termine' } },
    object: { id: 'https://tegs-learning.edu.ht/activities/test-sprint4' },
  }, tok1);
  assert(stmt.status === 201, 'xAPI Sprint 2 OK');

  const mods = await request('GET', '/modules', null, tok1);
  assert(mods.status === 200, 'Modules list Sprint 3 OK');
  assert(mods.data.count >= 1, 'Au moins 1 module');

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
    console.log('\n  [SUCCES] Sprint 4 valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  console.error('Assurez-vous que le backend est demarre et MongoDB accessible.');
  process.exit(1);
});
