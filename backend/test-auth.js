/**
 * TEGS-Learning - Sprint 1 : Script de Test d'Authentification & Isolation Multi-Tenant
 *
 * Ce script prouve que :
 * 1. On peut creer une ecole (tenant)
 * 2. On peut creer un utilisateur lie a cette ecole
 * 3. Un utilisateur ne peut PAS acceder aux ressources d'une autre ecole
 *
 * Pre-requis : MongoDB en cours d'execution, backend demarre (npm run dev)
 * Usage : node test-auth.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';

// Helper HTTP minimaliste (zero dependance externe)
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

// Compteurs de test
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
  console.log('=== TEGS-Learning | Sprint 1 - Tests Auth & Multi-Tenant ===\n');

  // -----------------------------------------------------------------------
  // 1. Health check
  // -----------------------------------------------------------------------
  console.log('--- Test 0 : Health Check ---');
  const health = await request('GET', '/health');
  assert(health.status === 200 && health.data.status === 'ok', 'API accessible');

  // -----------------------------------------------------------------------
  // 2. Creer deux ecoles (tenants)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Creation des ecoles ---');

  const school1 = await request('POST', '/tenants', {
    name: 'Ecole Nationale de Ouanaminthe',
    code: 'ENO-001',
    address: 'Ouanaminthe, Nord-Est',
    contactEmail: 'admin@eno.edu.ht',
  });
  assert(school1.status === 201, 'Ecole 1 (Ouanaminthe) creee');
  const tenant1Id = school1.data.tenant?._id;
  assert(!!tenant1Id, 'Ecole 1 a un _id');

  const school2 = await request('POST', '/tenants', {
    name: 'Ecole Nationale de Fort-Liberte',
    code: 'ENFL-001',
    address: 'Fort-Liberte, Nord-Est',
    contactEmail: 'admin@enfl.edu.ht',
  });
  assert(school2.status === 201, 'Ecole 2 (Fort-Liberte) creee');
  const tenant2Id = school2.data.tenant?._id;
  assert(!!tenant2Id, 'Ecole 2 a un _id');

  // Verifier unicite du code
  const duplicate = await request('POST', '/tenants', {
    name: 'Doublon',
    code: 'ENO-001',
  });
  assert(duplicate.status === 409, 'Code ecole en doublon rejete (409)');

  // -----------------------------------------------------------------------
  // 3. Creer des utilisateurs dans chaque ecole
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Creation des utilisateurs ---');

  const admin1 = await request('POST', '/auth/register', {
    email: 'admin@ouanaminthe.edu.ht',
    password: 'Admin123!',
    firstName: 'Jean',
    lastName: 'Baptiste',
    role: 'admin_ddene',
    tenant_id: tenant1Id,
  });
  assert(admin1.status === 201, 'Admin Ecole 1 cree');
  const token1 = admin1.data.token;
  assert(!!token1, 'Token JWT genere pour Admin Ecole 1');

  const teacher1 = await request('POST', '/auth/register', {
    email: 'prof@ouanaminthe.edu.ht',
    password: 'Prof1234',
    firstName: 'Marie',
    lastName: 'Duval',
    role: 'teacher',
    tenant_id: tenant1Id,
  });
  assert(teacher1.status === 201, 'Enseignant Ecole 1 cree');

  const admin2 = await request('POST', '/auth/register', {
    email: 'admin@fortliberte.edu.ht',
    password: 'Admin456!',
    firstName: 'Pierre',
    lastName: 'Louis',
    role: 'admin_ddene',
    tenant_id: tenant2Id,
  });
  assert(admin2.status === 201, 'Admin Ecole 2 cree');
  const token2 = admin2.data.token;
  assert(!!token2, 'Token JWT genere pour Admin Ecole 2');

  // Verifier doublon email dans le meme tenant
  const dupUser = await request('POST', '/auth/register', {
    email: 'admin@ouanaminthe.edu.ht',
    password: 'Other123',
    firstName: 'Autre',
    lastName: 'Personne',
    role: 'teacher',
    tenant_id: tenant1Id,
  });
  assert(dupUser.status === 409, 'Email en doublon dans le meme tenant rejete (409)');

  // -----------------------------------------------------------------------
  // 4. Login
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Authentification (Login) ---');

  const login1 = await request('POST', '/auth/login', {
    email: 'admin@ouanaminthe.edu.ht',
    password: 'Admin123!',
    tenant_id: tenant1Id,
  });
  assert(login1.status === 200, 'Login Admin Ecole 1 reussi');
  assert(!!login1.data.token, 'Token retourne au login');
  const freshToken1 = login1.data.token;

  // Login avec mauvais mot de passe
  const badLogin = await request('POST', '/auth/login', {
    email: 'admin@ouanaminthe.edu.ht',
    password: 'MauvaisMDP',
    tenant_id: tenant1Id,
  });
  assert(badLogin.status === 401, 'Mauvais mot de passe rejete (401)');

  // Login avec bon email mais mauvais tenant (cross-tenant)
  const crossLogin = await request('POST', '/auth/login', {
    email: 'admin@ouanaminthe.edu.ht',
    password: 'Admin123!',
    tenant_id: tenant2Id,
  });
  assert(crossLogin.status === 401, 'Login cross-tenant rejete (401)');

  // -----------------------------------------------------------------------
  // 5. Route protegee /me
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Route protegee /me ---');

  const me1 = await request('GET', '/auth/me', null, freshToken1);
  assert(me1.status === 200, 'Acces /me avec token valide');
  assert(me1.data.user.tenant_id === tenant1Id, '/me retourne le bon tenant_id');

  const meNoToken = await request('GET', '/auth/me');
  assert(meNoToken.status === 401, 'Acces /me sans token rejete (401)');

  // -----------------------------------------------------------------------
  // 6. TEST CRITIQUE : Isolation Multi-Tenant
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : ISOLATION MULTI-TENANT (TEST CRITIQUE) ---');

  // Admin Ecole 1 liste les utilisateurs -> ne doit voir QUE ceux de Ecole 1
  const users1 = await request('GET', '/users', null, freshToken1);
  assert(users1.status === 200, 'Admin Ecole 1 peut lister les users');
  assert(users1.data.count === 2, 'Ecole 1 a exactement 2 utilisateurs (admin + teacher)');

  // Verifier que TOUS les users retournes ont le bon tenant_id
  const allBelongToTenant1 = users1.data.users.every(
    (u) => u.tenant_id === tenant1Id
  );
  assert(allBelongToTenant1, 'TOUS les users retournes appartiennent a Ecole 1');

  // Admin Ecole 2 liste les utilisateurs -> ne doit voir QUE ceux de Ecole 2
  const login2 = await request('POST', '/auth/login', {
    email: 'admin@fortliberte.edu.ht',
    password: 'Admin456!',
    tenant_id: tenant2Id,
  });
  const freshToken2 = login2.data.token;

  const users2 = await request('GET', '/users', null, freshToken2);
  assert(users2.status === 200, 'Admin Ecole 2 peut lister les users');
  assert(users2.data.count === 1, 'Ecole 2 a exactement 1 utilisateur (admin)');

  const allBelongToTenant2 = users2.data.users.every(
    (u) => u.tenant_id === tenant2Id
  );
  assert(allBelongToTenant2, 'TOUS les users retournes appartiennent a Ecole 2');

  // Verification croisee : Ecole 1 ne contient PAS les users d'Ecole 2
  const noLeakFrom2to1 = users1.data.users.every(
    (u) => u.tenant_id !== tenant2Id
  );
  assert(noLeakFrom2to1, 'AUCUNE fuite de donnees de Ecole 2 vers Ecole 1');

  const noLeakFrom1to2 = users2.data.users.every(
    (u) => u.tenant_id !== tenant1Id
  );
  assert(noLeakFrom1to2, 'AUCUNE fuite de donnees de Ecole 1 vers Ecole 2');

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
    console.log('\n  [SUCCES] Sprint 1 valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  console.error('Assurez-vous que le backend est demarre (npm run dev) et MongoDB accessible.');
  process.exit(1);
});
