/**
 * TEGS-Learning - Sprint 10 : Tests Analytics Dashboard
 *
 * Ce script valide :
 * 1. Overview KPIs (totaux, taux reussite, score moyen)
 * 2. Top modules (par taux de reussite)
 * 3. Progression hebdomadaire (par jour)
 * 4. Comparaison ecoles (cross-tenant, admin_ddene)
 * 5. Repartition par source (inspect-mobile, sigeee-desktop, direct)
 * 6. Leaderboard (classement eleves)
 * 7. Export CSV
 * 8. Export JSON (rapport structuré)
 * 9. Filtrage par date et par source
 * 10. Page frontend analytics existe
 * 11. Zero regression Sprints 1-9
 *
 * Pre-requis : Backend demarre + donnees du Sprint 9 (100 statements sync)
 * Usage : node test-sprint10.js
 */

const { fetch: undiciFetch } = require('undici');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/api';
const PUBLIC_URL = process.env.BASE_URL
  ? process.env.BASE_URL.replace('/api', '')
  : 'http://127.0.0.1:3000';
const ROOT = path.join(__dirname, '..');

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
  else data = await res.text();
  return { status: res.status, data, headers: res.headers };
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
  console.log('=== TEGS-Learning | Sprint 10 - Tests Analytics Dashboard ===\n');

  const uid = Date.now().toString(36);

  // -----------------------------------------------------------------------
  // 0. Setup : Creer 2 ecoles avec donnees variees
  // -----------------------------------------------------------------------
  console.log('--- Setup : Ecoles + Donnees ---');

  const school1 = await request('POST', '/tenants', {
    name: 'Lycee National Ouanaminthe',
    code: `ANALYTICS-OUA-${uid}`,
    address: 'Ouanaminthe, Nord-Est',
  });
  assert(school1.status === 201, 'Ecole 1 creee');
  const t1 = school1.data.tenant._id;

  const admin1 = await request('POST', '/auth/register', {
    email: `analytics-${uid}@ouanaminthe.edu.ht`,
    password: 'Admin123',
    firstName: 'Jean',
    lastName: 'Baptiste',
    role: 'admin_ddene',
    tenant_id: t1,
  });
  const tok1 = admin1.data.token;
  const u1 = admin1.data.user._id;

  const school2 = await request('POST', '/tenants', {
    name: 'College Mixte Jacmel',
    code: `ANALYTICS-JAC-${uid}`,
    address: 'Jacmel, Sud-Est',
  });
  const t2 = school2.data.tenant._id;

  const admin2 = await request('POST', '/auth/register', {
    email: `analytics-${uid}@jacmel.edu.ht`,
    password: 'Admin456',
    firstName: 'Rose',
    lastName: 'Marie',
    role: 'admin_ddene',
    tenant_id: t2,
  });
  const tok2 = admin2.data.token;
  const u2 = admin2.data.user._id;

  // Injecter des donnees variees via sync/batch
  const verbs = [
    { id: 'http://adlnet.gov/expapi/verbs/passed', display: { 'fr-HT': 'a reussi' } },
    { id: 'http://adlnet.gov/expapi/verbs/failed', display: { 'fr-HT': 'a echoue' } },
    { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'fr-HT': 'a complete' } },
    { id: 'http://adlnet.gov/expapi/verbs/scored', display: { 'fr-HT': 'a obtenu un score' } },
    { id: 'http://adlnet.gov/expapi/verbs/initialized', display: { 'fr-HT': 'a initialise' } },
  ];
  const subjects = ['math-101', 'francais-201', 'sciences-301', 'histoire-401', 'creole-501'];

  // Ecole 1 : 80 statements (bons resultats)
  const batch1 = [];
  for (let i = 0; i < 80; i++) {
    const verb = i < 50 ? verbs[0] : (i < 60 ? verbs[1] : verbs[i % verbs.length]);
    const score = verb.id.includes('passed') ? 0.6 + Math.random() * 0.4 : Math.random() * 0.5;
    const day = new Date();
    day.setDate(day.getDate() - (i % 7));
    batch1.push({
      id: crypto.randomUUID(),
      actor: { user_id: u1, name: 'Jean Baptiste', mbox: 'mailto:jean@oua.edu.ht' },
      verb, object: { id: `https://tegs-learning.edu.ht/activities/${subjects[i % 5]}`,
        definition: { name: { 'fr-HT': `Examen ${subjects[i % 5]}` } } },
      result: { score: { scaled: Math.round(score * 100) / 100, raw: Math.round(score * 20), min: 0, max: 20 },
        success: score >= 0.5, completion: true, duration: `PT${15 + i}M` },
      timestamp: day.toISOString(),
    });
  }

  const sync1 = await request('POST', '/sync/batch', {
    source: 'inspect-mobile', deviceId: 'tab-oua-001', statements: batch1,
  }, tok1);
  assert(sync1.status === 200 && sync1.data.synced === 80, `80 statements Ecole 1 (got ${sync1.data.synced})`);

  // Ecole 2 : 40 statements (resultats moyens) via SIGEEE
  const batch2 = [];
  for (let i = 0; i < 40; i++) {
    const verb = i < 15 ? verbs[0] : (i < 30 ? verbs[1] : verbs[2]);
    const score = Math.random() * 0.7;
    const day = new Date();
    day.setDate(day.getDate() - (i % 7));
    batch2.push({
      id: crypto.randomUUID(),
      actor: { user_id: u2, name: 'Rose Marie', mbox: 'mailto:rose@jac.edu.ht' },
      verb, object: { id: `https://tegs-learning.edu.ht/activities/${subjects[i % 3]}`,
        definition: { name: { 'fr-HT': `Examen ${subjects[i % 3]}` } } },
      result: { score: { scaled: Math.round(score * 100) / 100 }, success: score >= 0.5, completion: true },
      timestamp: day.toISOString(),
    });
  }

  const sync2 = await request('POST', '/sync/batch', {
    source: 'sigeee-desktop', deviceId: 'pc-jac-001', statements: batch2,
  }, tok2);
  assert(sync2.status === 200 && sync2.data.synced === 40, `40 statements Ecole 2 (got ${sync2.data.synced})`);

  // Quelques statements directs (sans source) via xAPI normal
  for (let i = 0; i < 5; i++) {
    await request('POST', '/xapi/statements', {
      verb: verbs[0], object: { id: `https://tegs-learning.edu.ht/activities/direct-test-${i}` },
      result: { score: { scaled: 0.8 + Math.random() * 0.2 }, success: true },
    }, tok1);
  }

  // -----------------------------------------------------------------------
  // 1. Overview KPIs
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Overview KPIs ---');

  const ov1 = await request('GET', '/analytics/overview', null, tok1);
  assert(ov1.status === 200, 'Overview retourne 200');
  assert(ov1.data.totalStatements >= 80, `Total statements >= 80 (got ${ov1.data.totalStatements})`);
  assert(typeof ov1.data.successRate === 'number', 'Taux de reussite est un nombre');
  assert(ov1.data.successRate > 0, `Taux de reussite > 0 (got ${ov1.data.successRate}%)`);
  assert(typeof ov1.data.avgScore === 'number', 'Score moyen est un nombre');
  assert(ov1.data.avgScore > 0, `Score moyen > 0 (got ${ov1.data.avgScore})`);
  assert(ov1.data.totalUsers >= 1, 'Au moins 1 utilisateur actif');
  assert(Array.isArray(ov1.data.verbBreakdown), 'Ventilation des verbes est un tableau');
  assert(ov1.data.verbBreakdown.length >= 2, `Au moins 2 verbes (got ${ov1.data.verbBreakdown.length})`);

  // -----------------------------------------------------------------------
  // 2. Top Modules
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Top Modules ---');

  const tm1 = await request('GET', '/analytics/top-modules', null, tok1);
  assert(tm1.status === 200, 'Top modules retourne 200');
  assert(Array.isArray(tm1.data.modules), 'Modules est un tableau');
  assert(tm1.data.modules.length >= 1, `Au moins 1 module (got ${tm1.data.modules.length})`);
  assert(tm1.data.modules[0].successRate !== undefined, 'Premier module a un taux de reussite');
  assert(tm1.data.modules[0].totalAttempts > 0, 'Premier module a des tentatives');
  // Verifier que le tri est decroissant par taux de reussite
  if (tm1.data.modules.length >= 2) {
    assert(tm1.data.modules[0].successRate >= tm1.data.modules[1].successRate, 'Tri decroissant par taux');
  }

  // -----------------------------------------------------------------------
  // 3. Progression Hebdomadaire
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Progression Hebdomadaire ---');

  const wp1 = await request('GET', '/analytics/weekly-progress?days=7', null, tok1);
  assert(wp1.status === 200, 'Weekly progress retourne 200');
  assert(Array.isArray(wp1.data.progress), 'Progress est un tableau');
  assert(wp1.data.progress.length >= 1, `Au moins 1 jour (got ${wp1.data.progress.length})`);
  const firstDay = wp1.data.progress[0];
  assert(firstDay.date !== undefined, 'Jour a une date');
  assert(firstDay.total > 0, 'Jour a des activites');
  assert(firstDay.passed !== undefined, 'Jour a des reussis');

  // -----------------------------------------------------------------------
  // 4. Comparaison Ecoles (admin_ddene)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Comparaison Ecoles ---');

  const cs1 = await request('GET', '/analytics/compare-schools', null, tok1);
  assert(cs1.status === 200, 'Compare schools retourne 200');
  assert(Array.isArray(cs1.data.schools), 'Schools est un tableau');
  assert(cs1.data.schools.length >= 2, `Au moins 2 ecoles (got ${cs1.data.schools.length})`);

  const ouaSchool = cs1.data.schools.find(s => s.tenantId === t1);
  const jacSchool = cs1.data.schools.find(s => s.tenantId === t2);
  assert(ouaSchool !== undefined, 'Ouanaminthe presente dans la comparaison');
  assert(jacSchool !== undefined, 'Jacmel presente dans la comparaison');
  assert(ouaSchool.totalStatements >= 80, `Ouanaminthe >= 80 statements (got ${ouaSchool?.totalStatements})`);
  assert(jacSchool.totalStatements >= 40, `Jacmel >= 40 statements (got ${jacSchool?.totalStatements})`);
  assert(typeof ouaSchool.successRate === 'number', 'Taux de reussite Ouanaminthe');
  assert(ouaSchool.activeUsers >= 1, 'Ouanaminthe a des utilisateurs actifs');

  // -----------------------------------------------------------------------
  // 5. Sources
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : Repartition par source ---');

  const src1 = await request('GET', '/analytics/sources', null, tok1);
  assert(src1.status === 200, 'Sources retourne 200');
  assert(Array.isArray(src1.data.sources), 'Sources est un tableau');
  assert(src1.data.sources.length >= 1, `Au moins 1 source (got ${src1.data.sources.length})`);

  const mobileSource = src1.data.sources.find(s => s.source === 'inspect-mobile');
  assert(mobileSource !== undefined, 'Source inspect-mobile presente');
  assert(mobileSource.count >= 80, `inspect-mobile >= 80 (got ${mobileSource?.count})`);

  // -----------------------------------------------------------------------
  // 6. Leaderboard
  // -----------------------------------------------------------------------
  console.log('\n--- Test 6 : Leaderboard ---');

  const lb1 = await request('GET', '/analytics/leaderboard', null, tok1);
  assert(lb1.status === 200, 'Leaderboard retourne 200');
  assert(Array.isArray(lb1.data.leaderboard), 'Leaderboard est un tableau');
  assert(lb1.data.leaderboard.length >= 1, `Au moins 1 eleve (got ${lb1.data.leaderboard.length})`);
  assert(lb1.data.leaderboard[0].rank === 1, 'Premier est rang 1');
  assert(lb1.data.leaderboard[0].avgScore > 0, 'Premier a un score > 0');
  assert(lb1.data.leaderboard[0].name, 'Premier a un nom');

  // -----------------------------------------------------------------------
  // 7. Export CSV
  // -----------------------------------------------------------------------
  console.log('\n--- Test 7 : Export CSV ---');

  const csv1 = await request('GET', '/analytics/export/csv', null, tok1);
  assert(csv1.status === 200, 'Export CSV retourne 200');
  const csvContent = typeof csv1.data === 'string' ? csv1.data : '';
  assert(csvContent.includes('statementId'), 'CSV contient header statementId');
  assert(csvContent.includes('timestamp'), 'CSV contient header timestamp');
  assert(csvContent.includes('scoreScaled'), 'CSV contient header scoreScaled');
  const csvLines = csvContent.split('\n').filter(l => l.trim());
  assert(csvLines.length >= 2, `CSV a au moins 2 lignes (got ${csvLines.length})`);

  // Verifier isolation : CSV ne contient pas les donnees de Jacmel
  assert(!csvContent.includes('Rose Marie'), 'CSV ne contient PAS les donnees Jacmel (isolation)');

  // -----------------------------------------------------------------------
  // 8. Export JSON (rapport)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 8 : Export JSON ---');

  const json1 = await request('GET', '/analytics/export/json', null, tok1);
  assert(json1.status === 200, 'Export JSON retourne 200');
  assert(json1.data.report !== undefined, 'Rapport present');
  assert(json1.data.report.generatedAt, 'Date de generation');
  assert(json1.data.report.school.includes('Ouanaminthe'), 'Nom ecole correct');
  assert(json1.data.report.summary.totalStatements >= 80, 'Total dans le rapport');
  assert(typeof json1.data.report.summary.successRate === 'number', 'Taux dans le rapport');
  assert(Array.isArray(json1.data.report.topActivities), 'Top activites dans le rapport');
  assert(Array.isArray(json1.data.report.sources), 'Sources dans le rapport');

  // -----------------------------------------------------------------------
  // 9. Filtrage par date et par source
  // -----------------------------------------------------------------------
  console.log('\n--- Test 9 : Filtrage avance ---');

  // Filtrer par source
  const filteredSrc = await request('GET', '/analytics/overview?source=inspect-mobile', null, tok1);
  assert(filteredSrc.status === 200, 'Filtre par source OK');
  assert(filteredSrc.data.totalStatements >= 1, `Filtre source retourne des resultats (got ${filteredSrc.data.totalStatements})`);

  // Filtrer par date (dernier jour)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const filteredDate = await request('GET',
    `/analytics/overview?since=${yesterday.toISOString()}`, null, tok1);
  assert(filteredDate.status === 200, 'Filtre par date OK');
  assert(filteredDate.data.totalStatements >= 1, `Filtre date retourne des resultats (got ${filteredDate.data.totalStatements})`);

  // Filtre combine
  const filteredBoth = await request('GET',
    `/analytics/overview?source=inspect-mobile&since=${yesterday.toISOString()}`, null, tok1);
  assert(filteredBoth.status === 200, 'Filtre combine OK');

  // -----------------------------------------------------------------------
  // 10. Frontend analytics page
  // -----------------------------------------------------------------------
  console.log('\n--- Test 10 : Frontend Analytics ---');

  const analyticsPage = path.join(ROOT, 'frontend', 'pages', 'admin', 'analytics.vue');
  assert(fs.existsSync(analyticsPage), 'Page analytics.vue existe');

  const pageContent = fs.readFileSync(analyticsPage, 'utf-8');
  assert(pageContent.includes('vue-chartjs'), 'Page utilise vue-chartjs');
  assert(pageContent.includes('Bar') && pageContent.includes('Doughnut'), 'Page a des graphiques (Bar + Doughnut)');
  assert(pageContent.includes('compare-schools'), 'Page inclut comparaison ecoles');
  assert(pageContent.includes('leaderboard'), 'Page inclut classement eleves');
  assert(pageContent.includes('export'), 'Page a un bouton export');
  assert(pageContent.includes('sourceFilter'), 'Page a un filtre par source');

  // Verifier que le layout admin a le lien Analytics
  const adminLayout = fs.readFileSync(path.join(ROOT, 'frontend', 'layouts', 'admin.vue'), 'utf-8');
  assert(adminLayout.includes('/admin/analytics'), 'Layout admin a le lien Analytics');

  // Verifier chart.js est installe
  const frontPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend', 'package.json'), 'utf-8'));
  assert(frontPkg.dependencies['chart.js'] !== undefined, 'chart.js installe');
  assert(frontPkg.dependencies['vue-chartjs'] !== undefined, 'vue-chartjs installe');

  // -----------------------------------------------------------------------
  // 11. Zero regression Sprints 1-9
  // -----------------------------------------------------------------------
  console.log('\n--- Test 11 : Zero regression Sprints 1-9 ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health OK');

  const login = await request('POST', '/auth/login', {
    email: `analytics-${uid}@ouanaminthe.edu.ht`,
    password: 'Admin123', tenant_id: t1,
  });
  assert(login.status === 200, 'Login Sprint 1 OK');

  const stmt = await request('POST', '/xapi/statements', {
    verb: verbs[0], object: { id: 'https://tegs-learning.edu.ht/regression-s10' },
  }, tok1);
  assert(stmt.status === 201, 'xAPI Sprint 2 OK');

  const mod = await request('POST', '/modules', {
    title: 'Module S10', description: 'Regression', language: 'fr',
  }, tok1);
  assert(mod.status === 201, 'Module Sprint 3 OK');

  const moduleId = mod.data.module._id;
  const struct = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [{ title: 'Ch1', screens: [{ title: 'E1' }] }],
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

  const gzRes = await undiciFetch(`${BASE_URL}/health`, { headers: { 'Accept-Encoding': 'gzip' } });
  assert(gzRes.status === 200, 'Compression Sprint 8 OK');

  const syncStatus = await request('GET', '/sync/status', null, tok1);
  assert(syncStatus.status === 200, 'Sync status Sprint 9 OK');

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
    console.log('\n  [SUCCES] Sprint 10 valide a 100% !');
    console.log('  LES 10 SPRINTS SONT COMPLETS !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  process.exit(1);
});
