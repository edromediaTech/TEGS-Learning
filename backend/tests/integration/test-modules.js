/**
 * TEGS-Learning - Sprint 3 : Script de Test Modules CRUD & Structure
 *
 * Ce script prouve que :
 * 1. Un admin peut creer un module "Francais 1ere Annee"
 * 2. Il peut y ajouter 3 chapitres et 5 ecrans
 * 3. CRUD complet fonctionne (lecture, mise a jour, suppression)
 * 4. Isolation : Un admin d'une autre ecole ne voit pas ce module
 * 5. Un student ne peut pas acceder aux routes modules (role insuffisant)
 * 6. Zero regression Sprint 1 & 2
 *
 * Pre-requis : MongoDB en cours d'execution, backend demarre (npm run dev)
 * Usage : node test-modules.js
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
  console.log('=== TEGS-Learning | Sprint 3 - Tests Modules CRUD & Structure ===\n');

  // -----------------------------------------------------------------------
  // 0. Setup : 2 ecoles, 1 admin + 1 teacher + 1 student ecole 1, 1 admin ecole 2
  // -----------------------------------------------------------------------
  console.log('--- Setup : Creation des ecoles et utilisateurs ---');

  const school1 = await request('POST', '/tenants', {
    name: 'Ecole Nationale de Trou-du-Nord',
    code: 'MOD-TDN-001',
    address: 'Trou-du-Nord, Nord-Est',
  });
  assert(school1.status === 201, 'Ecole 1 creee');
  const tenant1Id = school1.data.tenant._id;

  const school2 = await request('POST', '/tenants', {
    name: 'Ecole Nationale de Terrier-Rouge',
    code: 'MOD-TR-001',
    address: 'Terrier-Rouge, Nord-Est',
  });
  assert(school2.status === 201, 'Ecole 2 creee');
  const tenant2Id = school2.data.tenant._id;

  const admin1 = await request('POST', '/auth/register', {
    email: 'admin-mod@tdn.edu.ht',
    password: 'Admin123!',
    firstName: 'Jacques',
    lastName: 'Pierre',
    role: 'admin_ddene',
    tenant_id: tenant1Id,
  });
  assert(admin1.status === 201, 'Admin Ecole 1 cree');
  const admin1Token = admin1.data.token;

  const teacher1 = await request('POST', '/auth/register', {
    email: 'teacher-mod@tdn.edu.ht',
    password: 'Teach123!',
    firstName: 'Rose',
    lastName: 'Marie',
    role: 'teacher',
    tenant_id: tenant1Id,
  });
  assert(teacher1.status === 201, 'Teacher Ecole 1 cree');
  const teacher1Token = teacher1.data.token;

  const student1 = await request('POST', '/auth/register', {
    email: 'student-mod@tdn.edu.ht',
    password: 'Stud123!',
    firstName: 'Paul',
    lastName: 'Jean',
    role: 'student',
    tenant_id: tenant1Id,
  });
  assert(student1.status === 201, 'Student Ecole 1 cree');
  const student1Token = student1.data.token;

  const admin2 = await request('POST', '/auth/register', {
    email: 'admin-mod@tr.edu.ht',
    password: 'Admin456!',
    firstName: 'Marie',
    lastName: 'Claude',
    role: 'admin_ddene',
    tenant_id: tenant2Id,
  });
  assert(admin2.status === 201, 'Admin Ecole 2 cree');
  const admin2Token = admin2.data.token;

  // -----------------------------------------------------------------------
  // 1. Creation de modules
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Creation de modules ---');

  const mod1 = await request('POST', '/modules', {
    title: 'Francais 1ere Annee',
    description: 'Cours de francais pour la premiere annee fondamentale',
    language: 'fr',
  }, admin1Token);
  assert(mod1.status === 201, 'Module "Francais 1ere Annee" cree (201)');
  assert(mod1.data.module.title === 'Francais 1ere Annee', 'Titre correct');
  assert(mod1.data.module.tenant_id === tenant1Id, 'tenant_id injecte');
  assert(mod1.data.module.status === 'draft', 'Status = draft par defaut');
  const module1Id = mod1.data.module._id;

  const mod2 = await request('POST', '/modules', {
    title: 'Mathematiques 1ere Annee',
    description: 'Cours de maths',
    language: 'fr',
  }, admin1Token);
  assert(mod2.status === 201, 'Module "Mathematiques" cree');
  const module2Id = mod2.data.module._id;

  // Teacher peut aussi creer un module
  const mod3 = await request('POST', '/modules', {
    title: 'Sciences Naturelles',
    description: 'Cours de sciences',
    language: 'ht',
  }, teacher1Token);
  assert(mod3.status === 201, 'Teacher peut creer un module');

  // Module ecole 2
  const mod4 = await request('POST', '/modules', {
    title: 'Histoire de Haiti',
    description: 'Cours d\'histoire pour Terrier-Rouge',
    language: 'fr',
  }, admin2Token);
  assert(mod4.status === 201, 'Module Ecole 2 cree');

  // Validation : titre requis
  const noTitle = await request('POST', '/modules', {
    description: 'Sans titre',
  }, admin1Token);
  assert(noTitle.status === 400, 'Module sans titre rejete (400)');

  // Student ne peut pas creer de module
  const studentCreate = await request('POST', '/modules', {
    title: 'Test Student',
  }, student1Token);
  assert(studentCreate.status === 403, 'Student ne peut pas creer de module (403)');

  // Sans auth
  const noAuth = await request('POST', '/modules', {
    title: 'Test',
  });
  assert(noAuth.status === 401, 'Creation sans auth rejetee (401)');

  // -----------------------------------------------------------------------
  // 2. Liste des modules (tenant-isolated)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Liste des modules (isolation) ---');

  const list1 = await request('GET', '/modules', null, admin1Token);
  assert(list1.status === 200, 'Admin Ecole 1 peut lister les modules');
  assert(list1.data.count === 3, 'Ecole 1 a 3 modules');
  const allTenant1 = list1.data.modules.every(m => m.tenant_id === tenant1Id);
  assert(allTenant1, 'TOUS les modules appartiennent a Ecole 1');

  const list2 = await request('GET', '/modules', null, admin2Token);
  assert(list2.status === 200, 'Admin Ecole 2 peut lister les modules');
  assert(list2.data.count === 1, 'Ecole 2 a 1 module');
  assert(list2.data.modules[0].title === 'Histoire de Haiti', 'Module correct pour Ecole 2');

  const noLeak = list2.data.modules.every(m => m.tenant_id !== tenant1Id);
  assert(noLeak, 'AUCUNE fuite : Ecole 2 ne voit AUCUN module de Ecole 1');

  // -----------------------------------------------------------------------
  // 3. Lecture d'un module par ID
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Lecture d\'un module par ID ---');

  const get1 = await request('GET', `/modules/${module1Id}`, null, admin1Token);
  assert(get1.status === 200, 'Admin Ecole 1 peut lire son module');
  assert(get1.data.module.title === 'Francais 1ere Annee', 'Contenu correct');

  // Admin ecole 2 ne peut PAS lire un module d'ecole 1
  const crossGet = await request('GET', `/modules/${module1Id}`, null, admin2Token);
  assert(crossGet.status === 404, 'Admin Ecole 2 ne peut pas lire module Ecole 1 (404)');

  // -----------------------------------------------------------------------
  // 4. Mise a jour d'un module
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Mise a jour d\'un module ---');

  const update = await request('PUT', `/modules/${module1Id}`, {
    title: 'Francais - 1ere Annee Fondamentale',
    description: 'Programme complet de francais',
    status: 'published',
  }, admin1Token);
  assert(update.status === 200, 'Module mis a jour');
  assert(update.data.module.title === 'Francais - 1ere Annee Fondamentale', 'Titre mis a jour');
  assert(update.data.module.status === 'published', 'Status passe a published');

  // Admin ecole 2 ne peut PAS modifier un module d'ecole 1
  const crossUpdate = await request('PUT', `/modules/${module1Id}`, {
    title: 'Pirate',
  }, admin2Token);
  assert(crossUpdate.status === 404, 'Admin Ecole 2 ne peut pas modifier module Ecole 1 (404)');

  // -----------------------------------------------------------------------
  // 5. Structure : Ajout de 3 chapitres et 5 ecrans
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : Gestion de l\'arborescence (3 chapitres, 5 ecrans) ---');

  const structure = await request('PUT', `/modules/${module1Id}/structure`, {
    sections: [
      {
        title: 'Chapitre 1 : L\'alphabet',
        order: 0,
        screens: [
          { title: 'Les voyelles', order: 0 },
          { title: 'Les consonnes', order: 1 },
        ],
      },
      {
        title: 'Chapitre 2 : Les syllabes',
        order: 1,
        screens: [
          { title: 'Syllabes simples', order: 0 },
          { title: 'Syllabes composees', order: 1 },
        ],
      },
      {
        title: 'Chapitre 3 : Les mots',
        order: 2,
        screens: [
          { title: 'Vocabulaire de base', order: 0 },
        ],
      },
    ],
  }, admin1Token);
  assert(structure.status === 200, 'Structure mise a jour avec succes');
  assert(structure.data.module.sections.length === 3, '3 chapitres (sections) crees');

  const totalScreens = structure.data.module.sections.reduce(
    (acc, s) => acc + s.screens.length, 0
  );
  assert(totalScreens === 5, '5 ecrans au total');

  assert(
    structure.data.module.sections[0].title === 'Chapitre 1 : L\'alphabet',
    'Chapitre 1 correct'
  );
  assert(
    structure.data.module.sections[0].screens[0].title === 'Les voyelles',
    'Ecran 1.1 correct'
  );
  assert(
    structure.data.module.sections[2].screens[0].title === 'Vocabulaire de base',
    'Ecran 3.1 correct'
  );

  // Verification via GET que la structure persiste
  const getWithStructure = await request('GET', `/modules/${module1Id}`, null, admin1Token);
  assert(getWithStructure.data.module.sections.length === 3, 'Structure persistee en base');

  // Admin ecole 2 ne peut PAS modifier la structure d'ecole 1
  const crossStructure = await request('PUT', `/modules/${module1Id}/structure`, {
    sections: [{ title: 'Pirate' }],
  }, admin2Token);
  assert(crossStructure.status === 404, 'Admin Ecole 2 ne peut pas modifier structure Ecole 1 (404)');

  // Structure invalide : sections pas un tableau
  const badStructure = await request('PUT', `/modules/${module1Id}/structure`, {
    sections: 'pas un tableau',
  }, admin1Token);
  assert(badStructure.status === 400, 'Structure invalide rejetee (400)');

  // Section sans titre
  const noSectionTitle = await request('PUT', `/modules/${module1Id}/structure`, {
    sections: [{ screens: [] }],
  }, admin1Token);
  assert(noSectionTitle.status === 400, 'Section sans titre rejetee (400)');

  // -----------------------------------------------------------------------
  // 6. Suppression d'un module
  // -----------------------------------------------------------------------
  console.log('\n--- Test 6 : Suppression d\'un module ---');

  // Admin ecole 2 ne peut PAS supprimer un module d'ecole 1
  const crossDelete = await request('DELETE', `/modules/${module2Id}`, null, admin2Token);
  assert(crossDelete.status === 404, 'Admin Ecole 2 ne peut pas supprimer module Ecole 1 (404)');

  const del = await request('DELETE', `/modules/${module2Id}`, null, admin1Token);
  assert(del.status === 200, 'Module supprime par Admin Ecole 1');

  // Verification : plus que 2 modules dans ecole 1
  const listAfterDel = await request('GET', '/modules', null, admin1Token);
  assert(listAfterDel.data.count === 2, 'Ecole 1 a maintenant 2 modules');

  // -----------------------------------------------------------------------
  // 7. Zero Regression Sprint 1 & 2
  // -----------------------------------------------------------------------
  console.log('\n--- Test 7 : Zero Regression Sprint 1 & 2 ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health check OK');

  const login = await request('POST', '/auth/login', {
    email: 'admin-mod@tdn.edu.ht',
    password: 'Admin123!',
    tenant_id: tenant1Id,
  });
  assert(login.status === 200, 'Login Sprint 1 fonctionne');

  const me = await request('GET', '/auth/me', null, login.data.token);
  assert(me.status === 200, 'Route /me Sprint 1 fonctionne');

  // xAPI Sprint 2 - enregistrer et lire un statement
  const stmt = await request('POST', '/xapi/statements', {
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'fr-HT': 'a termine' },
    },
    object: {
      id: 'https://tegs-learning.edu.ht/activities/test-regression',
    },
  }, admin1Token);
  assert(stmt.status === 201, 'xAPI POST Sprint 2 fonctionne');

  const stmts = await request('GET', '/xapi/statements', null, admin1Token);
  assert(stmts.status === 200, 'xAPI GET Sprint 2 fonctionne');

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
    console.log('\n  [SUCCES] Sprint 3 Backend valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  console.error('Assurez-vous que le backend est demarre (npm run dev) et MongoDB accessible.');
  process.exit(1);
});
