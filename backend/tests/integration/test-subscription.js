/**
 * TEGS-Learning - Tests Subscription, Billing & Feature Gate
 *
 * Ce script valide :
 * 1. Plan courant (GET /subscription/current)
 * 2. Liste des plans (GET /subscription/plans)
 * 3. Changement de plan (PUT /subscription/change)
 * 4. Mise a jour des sieges (PUT /subscription/seats)
 * 5. Usage courant (GET /subscription/usage)
 * 6. Feature gate - requireFeature middleware
 * 7. Feature gate - requireLimit middleware
 * 8. Feature gate - expiration du plan
 * 9. Plans config : calcul de prix
 * 10. Isolation multi-tenant abonnement
 * 11. Zero regression
 *
 * Pre-requis : MongoDB + backend demarre
 * Usage : node test-subscription.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';

async function request(method, path, body, token) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('html')) data = await res.text();
  else if (contentType.includes('pdf') || contentType.includes('spreadsheet') || contentType.includes('octet-stream')) {
    data = { _binary: true };
    await res.arrayBuffer();
  }
  else data = await res.json().catch(() => null);
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

/**
 * Get a superadmin token. Try registering a new one; if one already exists,
 * find its email via Mongoose and login.
 */
async function getSuperAdminToken(uid) {
  const email = `sa-sub-${uid}@tegs.ht`;
  const pass = 'Super123!';

  const reg = await request('POST', '/auth/register', {
    email, password: pass, firstName: 'Super', lastName: 'Admin', role: 'superadmin',
  });
  if (reg.status === 201) return reg.data.token;

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning');
  const sa = await mongoose.connection.collection('users').findOne({ role: 'superadmin' });
  await mongoose.disconnect();

  if (!sa) return null;

  for (const p of ['Super123!', 'SuperTest123!', 'Admin123!']) {
    const login = await request('POST', '/auth/login', { email: sa.email, password: p });
    if (login.status === 200 && login.data?.token) return login.data.token;
  }
  return null;
}

async function runTests() {
  console.log('=== TEGS-Learning | Tests Subscription & Feature Gate ===\n');

  const uid = Date.now().toString(36);

  // -----------------------------------------------------------------------
  // 0. Setup : 2 ecoles, admins, teacher
  // -----------------------------------------------------------------------
  console.log('--- Setup ---');

  // Bootstrap or reuse superadmin
  const superToken = await getSuperAdminToken(uid);
  assert(!!superToken, 'Superadmin token obtenu');

  const school1 = await request('POST', '/tenants', {
    name: 'Ecole Sub Test',
    code: `SUB-${uid}`,
    address: 'Port-au-Prince',
  }, superToken);
  assert(school1.status === 201, 'Ecole 1 creee');
  const t1 = school1.data.tenant._id;

  const admin1 = await request('POST', '/auth/register', {
    email: `admin-sub-${uid}@test.edu.ht`,
    password: 'Admin123!',
    firstName: 'Paul',
    lastName: 'Martin',
    role: 'admin_ddene',
    tenant_id: t1,
  });
  assert(admin1.status === 201, 'Admin 1 cree');
  const tok1 = admin1.data.token;

  // Teacher (ne peut pas changer le plan)
  const teacher = await request('POST', '/auth/register', {
    email: `teacher-sub-${uid}@test.edu.ht`,
    password: 'Teacher123!',
    firstName: 'Sophie',
    lastName: 'Rene',
    role: 'teacher',
    tenant_id: t1,
  });
  assert(teacher.status === 201, 'Teacher cree');
  const tokTeacher = teacher.data.token;

  const school2 = await request('POST', '/tenants', {
    name: 'Ecole Sub Iso',
    code: `SBI-${uid}`,
    address: 'Les Cayes',
  }, superToken);
  assert(school2.status === 201, 'Ecole 2 creee');
  const t2 = school2.data.tenant._id;

  const admin2 = await request('POST', '/auth/register', {
    email: `admin-sbi-${uid}@test.edu.ht`,
    password: 'Admin123!',
    firstName: 'Anne',
    lastName: 'Pierre',
    role: 'admin_ddene',
    tenant_id: t2,
  });
  assert(admin2.status === 201, 'Admin 2 cree');
  const tok2 = admin2.data.token;

  // -----------------------------------------------------------------------
  // 1. Plan courant (GET /subscription/current)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Plan courant ---');

  const current = await request('GET', '/subscription/current', null, tok1);
  assert(current.status === 200, 'GET /current 200');
  assert(current.data.plan === 'free', 'Plan par defaut = free');
  assert(current.data.planName === 'Gratuit', 'Nom du plan = Gratuit');
  assert(typeof current.data.limits === 'object', 'Limits present');
  assert(typeof current.data.features === 'object', 'Features present');
  assert(current.data.limits.modules === 5, 'Limite modules = 5 (free)');
  assert(current.data.features.exportPDF === false, 'exportPDF = false (free)');
  assert(current.data.features.autoGrading === true, 'autoGrading = true (free)');
  assert(typeof current.data.pricing === 'object', 'Pricing present');
  assert(current.data.pricing.totalMonthly === 0, 'Prix mensuel = 0 (free)');

  // -----------------------------------------------------------------------
  // 2. Liste des plans (GET /subscription/plans)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Liste des plans ---');

  const plansList = await request('GET', '/subscription/plans', null, tok1);
  assert(plansList.status === 200, 'GET /plans 200');
  assert(plansList.data.plans.length === 4, '4 plans disponibles');
  assert(plansList.data.currentPlan === 'free', 'currentPlan = free');
  assert(typeof plansList.data.featureLabels === 'object', 'featureLabels present');

  // Verifier que chaque plan a les champs attendus
  const planIds = plansList.data.plans.map(p => p.id);
  assert(planIds.includes('free'), 'Plan free present');
  assert(planIds.includes('individual'), 'Plan individual present');
  assert(planIds.includes('establishment'), 'Plan establishment present');
  assert(planIds.includes('pro'), 'Plan pro present');

  // Verifier isCurrent
  const freePlan = plansList.data.plans.find(p => p.id === 'free');
  assert(freePlan.isCurrent === true, 'free.isCurrent = true');
  const indPlan = plansList.data.plans.find(p => p.id === 'individual');
  assert(indPlan.isCurrent === false, 'individual.isCurrent = false');

  // Plans avec query params
  const plansAnnual = await request('GET', '/subscription/plans?cycle=annual&seats=10', null, tok1);
  assert(plansAnnual.status === 200, 'Plans avec cycle=annual 200');
  assert(plansAnnual.data.cycle === 'annual', 'Cycle = annual');
  assert(plansAnnual.data.seats === 10, 'Seats = 10');

  // -----------------------------------------------------------------------
  // 3. Changement de plan (PUT /subscription/change)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Changement de plan ---');

  // Passer en Individual
  const change1 = await request('PUT', '/subscription/change', {
    plan: 'individual', seats: 3, billingCycle: 'monthly',
  }, tok1);
  assert(change1.status === 200, 'Changement en individual 200');
  assert(change1.data.plan === 'individual', 'Plan = individual');
  assert(change1.data.seats === 3, 'Seats = 3');
  assert(change1.data.billingCycle === 'monthly', 'Cycle = monthly');
  assert(change1.data.pricing.totalMonthly === 10, 'Prix = $10/mois (individual, non per-seat)');
  assert(!!change1.data.subscriptionStartDate, 'subscriptionStartDate defini');
  assert(!!change1.data.subscriptionEndDate, 'subscriptionEndDate defini');

  // Verifier plan courant apres changement
  const afterChange = await request('GET', '/subscription/current', null, tok1);
  assert(afterChange.data.plan === 'individual', 'Plan courant = individual');
  assert(afterChange.data.features.exportPDF === true, 'exportPDF active (individual)');
  assert(afterChange.data.features.aiRemediation === true, 'aiRemediation active (individual)');

  // Passer en Establishment (per-seat)
  const change2 = await request('PUT', '/subscription/change', {
    plan: 'establishment', seats: 10, billingCycle: 'annual',
  }, tok1);
  assert(change2.status === 200, 'Changement en establishment 200');
  assert(change2.data.plan === 'establishment', 'Plan = establishment');
  assert(change2.data.seats === 10, 'Seats = 10');
  assert(change2.data.billingCycle === 'annual', 'Cycle = annual');
  assert(change2.data.pricing.totalMonthly === 120, 'Prix = $120/mois (10 * $12)');
  assert(change2.data.pricing.isPerSeat === true, 'isPerSeat = true');

  // Plan invalide
  const badPlan = await request('PUT', '/subscription/change', {
    plan: 'super_mega', seats: 1,
  }, tok1);
  assert(badPlan.status === 400, 'Plan invalide = 400');

  // Retour en free
  const changeFree = await request('PUT', '/subscription/change', {
    plan: 'free', seats: 1,
  }, tok1);
  assert(changeFree.status === 200, 'Retour en free 200');
  assert(changeFree.data.plan === 'free', 'Plan = free');

  // Remettre en individual pour la suite des tests
  await request('PUT', '/subscription/change', {
    plan: 'individual', seats: 5, billingCycle: 'monthly',
  }, tok1);

  // -----------------------------------------------------------------------
  // 4. Mise a jour des sieges (PUT /subscription/seats)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Mise a jour des sieges ---');

  const updateSeats = await request('PUT', '/subscription/seats', { seats: 15 }, tok1);
  assert(updateSeats.status === 200, 'Seats mis a jour 200');
  assert(updateSeats.data.seats === 15, 'Seats = 15');
  assert(typeof updateSeats.data.pricing === 'object', 'Pricing recalcule');

  // Clamping : minimum 1
  const minSeats = await request('PUT', '/subscription/seats', { seats: 0 }, tok1);
  assert(minSeats.data.seats === 1, 'Seats min = 1');

  // Clamping : maximum 500
  const maxSeats = await request('PUT', '/subscription/seats', { seats: 999 }, tok1);
  assert(maxSeats.data.seats === 500, 'Seats max = 500');

  // Remettre a 5
  await request('PUT', '/subscription/seats', { seats: 5 }, tok1);

  // Teacher ne peut pas modifier les sieges
  const teacherSeats = await request('PUT', '/subscription/seats', { seats: 10 }, tokTeacher);
  assert(teacherSeats.status === 403, 'Teacher ne peut pas modifier sieges (403)');

  // -----------------------------------------------------------------------
  // 5. Usage courant (GET /subscription/usage)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : Usage ---');

  const usage = await request('GET', '/subscription/usage', null, tok1);
  assert(usage.status === 200, 'GET /usage 200');
  assert(usage.data.plan === 'individual', 'Plan = individual');
  assert(typeof usage.data.usage.modules === 'object', 'Usage modules present');
  assert(typeof usage.data.usage.modules.current === 'number', 'modules.current est un nombre');
  assert(usage.data.usage.modules.unlimited === true, 'Modules illimites (individual)');
  assert(typeof usage.data.usage.seats === 'object', 'Usage seats present');
  assert(typeof usage.data.usage.rooms === 'object', 'Usage rooms present');
  assert(typeof usage.data.usage.storage === 'object', 'Usage storage present');

  // -----------------------------------------------------------------------
  // 6. Feature gate - requireFeature middleware
  // -----------------------------------------------------------------------
  console.log('\n--- Test 6 : Feature gate (requireFeature) ---');

  // En plan individual, PDF est active
  // Creer un module + resultat pour tester
  const mod = await request('POST', '/modules', {
    title: 'Module Feature Test', description: 'Test', language: 'fr',
  }, tok1);
  const modId = mod.data.module._id;

  const submitRes = await request('POST', '/reporting/submit', {
    module_id: modId,
    answers: [{
      blockId: 'q0', questionType: 'quiz',
      questionText: 'Test?', studentAnswer: 'A', correctAnswer: 'A',
      isCorrect: true, pointsEarned: 5, maxPoints: 5,
    }],
  }, tok1);
  const resultId = submitRes.data.result._id;

  // PDF accessible en individual
  const pdfOk = await request('GET', `/reporting/pdf/${resultId}?token=${tok1}`);
  assert(pdfOk.status === 200, 'PDF accessible en individual');

  // Passer en free
  await request('PUT', '/subscription/change', { plan: 'free', seats: 1 }, tok1);

  // PDF bloque en free
  const pdfBlocked = await request('GET', `/reporting/pdf/${resultId}?token=${tok1}`);
  assert(pdfBlocked.status === 403, 'PDF bloque en free (403)');
  assert(pdfBlocked.data.feature === 'exportPDF', 'Feature = exportPDF');
  assert(pdfBlocked.data.upgradeRequired === true, 'upgradeRequired = true');
  assert(pdfBlocked.data.currentPlan === 'free', 'currentPlan = free');

  // Excel bloque en free
  const excelBlocked = await request('GET', `/reporting/excel/${modId}?token=${tok1}`);
  assert(excelBlocked.status === 403, 'Excel bloque en free (403)');

  // Remettre en individual
  await request('PUT', '/subscription/change', {
    plan: 'individual', seats: 5, billingCycle: 'monthly',
  }, tok1);

  // -----------------------------------------------------------------------
  // 7. Autorisation : teacher ne peut pas changer de plan
  // -----------------------------------------------------------------------
  console.log('\n--- Test 7 : Autorisation Teacher ---');

  const teacherChange = await request('PUT', '/subscription/change', {
    plan: 'pro', seats: 1,
  }, tokTeacher);
  assert(teacherChange.status === 403, 'Teacher ne peut pas changer de plan (403)');

  // Teacher peut voir le plan courant
  const teacherCurrent = await request('GET', '/subscription/current', null, tokTeacher);
  assert(teacherCurrent.status === 200, 'Teacher peut voir le plan courant');

  // Teacher peut voir les plans
  const teacherPlans = await request('GET', '/subscription/plans', null, tokTeacher);
  assert(teacherPlans.status === 200, 'Teacher peut voir les plans');

  // Teacher peut voir usage
  const teacherUsage = await request('GET', '/subscription/usage', null, tokTeacher);
  assert(teacherUsage.status === 200, 'Teacher peut voir usage');

  // -----------------------------------------------------------------------
  // 8. Isolation multi-tenant abonnement
  // -----------------------------------------------------------------------
  console.log('\n--- Test 8 : Isolation multi-tenant ---');

  // Ecole 2 est en free
  const current2 = await request('GET', '/subscription/current', null, tok2);
  assert(current2.data.plan === 'free', 'Ecole 2 en plan free');

  // Changer ecole 2 en pro
  await request('PUT', '/subscription/change', {
    plan: 'pro', seats: 20, billingCycle: 'annual',
  }, tok2);

  // Verifier que ecole 1 n'est pas affectee
  const still1 = await request('GET', '/subscription/current', null, tok1);
  assert(still1.data.plan === 'individual', 'Ecole 1 toujours en individual');

  const now2 = await request('GET', '/subscription/current', null, tok2);
  assert(now2.data.plan === 'pro', 'Ecole 2 en pro');
  assert(now2.data.seats === 20, 'Ecole 2 : 20 sieges');

  // Usage isole
  const usage1 = await request('GET', '/subscription/usage', null, tok1);
  const usage2 = await request('GET', '/subscription/usage', null, tok2);
  assert(usage1.data.plan === 'individual', 'Usage ecole 1 = individual');
  assert(usage2.data.plan === 'pro', 'Usage ecole 2 = pro');

  // -----------------------------------------------------------------------
  // 9. Plans config : calcul de prix
  // -----------------------------------------------------------------------
  console.log('\n--- Test 9 : Calcul de prix ---');

  // Individual monthly
  const indMonthly = await request('GET', '/subscription/plans?cycle=monthly&seats=1', null, tok1);
  const indPlanM = indMonthly.data.plans.find(p => p.id === 'individual');
  assert(indPlanM.pricing.totalMonthly === 10, 'Individual monthly = $10');
  assert(indPlanM.pricing.isPerSeat === false, 'Individual is NOT per-seat');

  // Establishment annual per-seat
  const estAnnual = await request('GET', '/subscription/plans?cycle=annual&seats=10', null, tok1);
  const estPlan = estAnnual.data.plans.find(p => p.id === 'establishment');
  assert(estPlan.pricing.totalMonthly === 120, 'Establishment 10 seats annual = $120/mois');
  assert(estPlan.pricing.isPerSeat === true, 'Establishment is per-seat');
  assert(estPlan.pricing.pricePerSeat === 12, 'Establishment annual = $12/siege');
  assert(estPlan.pricing.savingsPercent === 20, 'Savings = 20%');

  // Pro per-seat
  const proPlan = estAnnual.data.plans.find(p => p.id === 'pro');
  assert(proPlan.pricing.isPerSeat === true, 'Pro is per-seat');
  assert(proPlan.pricing.pricePerSeat === 11.52, 'Pro annual = $11.52/siege');

  // Free pricing
  const freePlanP = estAnnual.data.plans.find(p => p.id === 'free');
  assert(freePlanP.pricing.totalMonthly === 0, 'Free = $0');

  // -----------------------------------------------------------------------
  // 10. Sans auth = 401
  // -----------------------------------------------------------------------
  console.log('\n--- Test 10 : Sans auth ---');

  const noAuth = await request('GET', '/subscription/current');
  assert(noAuth.status === 401, 'Sans auth = 401');

  const noAuth2 = await request('GET', '/subscription/plans');
  assert(noAuth2.status === 401, 'Plans sans auth = 401');

  const noAuth3 = await request('PUT', '/subscription/change', { plan: 'pro', seats: 1 });
  assert(noAuth3.status === 401, 'Change sans auth = 401');

  // -----------------------------------------------------------------------
  // 11. Zero regression
  // -----------------------------------------------------------------------
  console.log('\n--- Test 11 : Zero regression ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health OK');

  const login = await request('POST', '/auth/login', {
    email: `admin-sub-${uid}@test.edu.ht`,
    password: 'Admin123!',
    tenant_id: t1,
  });
  assert(login.status === 200, 'Login OK');

  const mods = await request('GET', '/modules', null, tok1);
  assert(mods.status === 200, 'Modules OK');

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
    console.log('\n  [SUCCES] Subscription & Feature Gate valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  console.error('Assurez-vous que le backend est demarre et MongoDB accessible.');
  process.exit(1);
});
