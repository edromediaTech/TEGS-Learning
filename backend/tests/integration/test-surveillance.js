/**
 * TEGS-Learning - Tests : Modes de Surveillance
 *
 * Ce script prouve que :
 * 1. Le modele Module accepte surveillanceMode (light/strict) et strictSettings
 * 2. PUT /api/modules/:id peut mettre a jour la config surveillance
 * 3. Les valeurs par defaut sont correctes (light, settings par defaut)
 * 4. La validation rejette un mode invalide
 * 5. Les pages partagees incluent le script de surveillance en mode strict
 * 6. Les pages partagees n'incluent PAS le script en mode light
 *
 * Pre-requis : MongoDB en cours d'execution, backend demarre (npm run dev)
 * Usage : node test-surveillance.js
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
  if (contentType.includes('text/html')) {
    const text = await res.text();
    return { status: res.status, data: null, html: text };
  }
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
  const uid = Date.now().toString(36);
  console.log('=== TEGS-Learning | Tests - Modes de Surveillance ===\n');

  // --- Setup : superadmin bootstrap + tenant + admin ---
  console.log('--- Setup ---');

  // Bootstrap or login superadmin
  let superToken;
  const saReg = await request('POST', '/auth/register', {
    email: `sa-surv-${uid}@tegs.ht`,
    password: 'Super123!',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'superadmin',
  });
  if (saReg.status === 201) {
    superToken = saReg.data.token;
  } else {
    // superadmin already exists — login
    const saLogin = await request('POST', '/auth/login', {
      email: `sa-surv-${uid}@tegs.ht`,
      password: 'Super123!',
    });
    superToken = saLogin.data?.token;
  }
  assert(!!superToken, 'Superadmin disponible');

  const school = await request('POST', '/tenants', {
    name: `Ecole Surveillance ${uid}`,
    code: `SURV-${uid}`,
    address: 'Test',
  }, superToken);
  assert(school.status === 201, 'Ecole creee');
  const tenantId = school.data.tenant._id;

  const admin = await request('POST', '/auth/register', {
    email: `surv-admin-${uid}@test.ht`,
    password: 'Admin123!',
    firstName: 'Test',
    lastName: 'Surveillance',
    role: 'admin_ddene',
    tenant_id: tenantId,
  });
  assert(admin.status === 201, 'Admin cree');
  const token = admin.data.token;

  // --- 1. Creer un module (defauts surveillance) ---
  console.log('\n--- 1. Defauts surveillance ---');

  const createRes = await request('POST', '/modules', {
    title: `Module Surv ${uid}`,
    tenant_id: tenantId,
  }, token);
  assert(createRes.status === 201, 'Module cree');
  const moduleId = createRes.data.module._id;

  const getRes = await request('GET', `/modules/${moduleId}`, null, token);
  assert(getRes.status === 200, 'Module recupere');
  assert(getRes.data.module.surveillanceMode === 'light', 'Default surveillanceMode = light');
  assert(getRes.data.module.strictSettings !== undefined, 'strictSettings present');
  assert(getRes.data.module.strictSettings.fullscreen === true, 'Default fullscreen = true');
  assert(getRes.data.module.strictSettings.antiCopy === true, 'Default antiCopy = true');
  assert(getRes.data.module.strictSettings.blurDetection === true, 'Default blurDetection = true');
  assert(getRes.data.module.strictSettings.maxBlurCount === 3, 'Default maxBlurCount = 3');
  assert(getRes.data.module.strictSettings.autoSubmitOnExceed === false, 'Default autoSubmitOnExceed = false');

  // --- 2. Passer en mode strict ---
  console.log('\n--- 2. Mode strict ---');

  const strictRes = await request('PUT', `/modules/${moduleId}`, {
    surveillanceMode: 'strict',
    strictSettings: {
      fullscreen: true,
      antiCopy: true,
      blurDetection: true,
      maxBlurCount: 5,
      autoSubmitOnExceed: true,
    },
  }, token);
  assert(strictRes.status === 200, 'Module mis a jour en mode strict');
  assert(strictRes.data.module.surveillanceMode === 'strict', 'surveillanceMode = strict');
  assert(strictRes.data.module.strictSettings.maxBlurCount === 5, 'maxBlurCount = 5');
  assert(strictRes.data.module.strictSettings.autoSubmitOnExceed === true, 'autoSubmitOnExceed = true');

  // --- 3. Passer en mode light ---
  console.log('\n--- 3. Retour mode light ---');

  const lightRes = await request('PUT', `/modules/${moduleId}`, {
    surveillanceMode: 'light',
  }, token);
  assert(lightRes.status === 200, 'Retour en mode light');
  assert(lightRes.data.module.surveillanceMode === 'light', 'surveillanceMode = light');

  // --- 4. Validation : mode invalide ---
  console.log('\n--- 4. Validation ---');

  const invalidRes = await request('PUT', `/modules/${moduleId}`, {
    surveillanceMode: 'extreme',
  }, token);
  assert(invalidRes.status === 400, 'Mode invalide rejete (400)');

  // --- 5. Desactiver des options individuelles ---
  console.log('\n--- 5. Options individuelles ---');

  const partialRes = await request('PUT', `/modules/${moduleId}`, {
    surveillanceMode: 'strict',
    strictSettings: {
      fullscreen: false,
      antiCopy: true,
      blurDetection: false,
      maxBlurCount: 10,
      autoSubmitOnExceed: false,
    },
  }, token);
  assert(partialRes.status === 200, 'Options partielles acceptees');
  assert(partialRes.data.module.strictSettings.fullscreen === false, 'fullscreen desactive');
  assert(partialRes.data.module.strictSettings.blurDetection === false, 'blurDetection desactive');
  assert(partialRes.data.module.strictSettings.maxBlurCount === 10, 'maxBlurCount = 10');

  // --- 6. Page partagee avec mode strict ---
  console.log('\n--- 6. Page partagee ---');

  // Ajouter un ecran pour que la page ait du contenu
  const structRes = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [{
      title: 'Chapitre 1',
      screens: [{ title: 'Ecran 1' }],
    }],
  }, token);
  assert(structRes.status === 200, 'Structure ajoutee');

  // Activer le partage
  const shareRes = await request('POST', `/modules/${moduleId}/share`, { enabled: true }, token);
  assert(shareRes.status === 200, 'Partage active');
  const shareToken = shareRes.data.shareToken;

  // Verifier la page partagee en mode strict
  const pageStrictRes = await request('GET', `/share/public/${shareToken}`);
  assert(pageStrictRes.status === 200, 'Page partagee accessible');
  assert(pageStrictRes.html && pageStrictRes.html.includes('SURVEILLANCE MODULE'), 'Script surveillance present en mode strict');
  assert(pageStrictRes.html && pageStrictRes.html.includes('Mode Surveille'), 'Badge "Mode Surveille" present');
  assert(pageStrictRes.html && pageStrictRes.html.includes('contextmenu'), 'Anti-copy present');

  // Repasser en mode light
  await request('PUT', `/modules/${moduleId}`, { surveillanceMode: 'light' }, token);
  const pageLightRes = await request('GET', `/share/public/${shareToken}`);
  assert(pageLightRes.status === 200, 'Page partagee en mode light accessible');
  assert(pageLightRes.html && !pageLightRes.html.includes('Mode Surveille'), 'Pas de badge surveillance en mode light');

  // --- Resultat ---
  console.log(`\n=== Resultats : ${passed} passes, ${failed} echoues sur ${passed + failed} ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('ERREUR FATALE:', err);
  process.exit(1);
});
