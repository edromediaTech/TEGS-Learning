/**
 * TEGS-Learning - Tests Reporting & Exports
 *
 * Ce script valide :
 * 1. Soumission publique (submit-public)
 * 2. Soumission authentifiee (submit)
 * 3. Liste des resultats par module
 * 4. Detail d'un resultat
 * 5. Generation PDF (feature-gated)
 * 6. Export Excel (feature-gated)
 * 7. Module timer (global + par question)
 * 8. Feature gate : plan free bloque PDF/Excel
 * 9. Isolation multi-tenant sur les resultats
 * 10. Zero regression
 *
 * Pre-requis : MongoDB + backend demarre
 * Usage : node test-reporting.js
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
  if (contentType.includes('html')) data = await res.text();
  else if (contentType.includes('xml')) data = await res.text();
  else if (contentType.includes('pdf') || contentType.includes('spreadsheet') || contentType.includes('octet-stream')) {
    data = { _binary: true, size: Number(res.headers.get('content-length') || 0) };
    // consume body
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
  const email = `sa-rpt-${uid}@tegs.ht`;
  const pass = 'Super123!';

  // Try registering
  const reg = await request('POST', '/auth/register', {
    email, password: pass, firstName: 'Super', lastName: 'Admin', role: 'superadmin',
  });
  if (reg.status === 201) return reg.data.token;

  // Superadmin exists — find its email via DB and login
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning');
  const sa = await mongoose.connection.collection('users').findOne({ role: 'superadmin' });
  await mongoose.disconnect();

  if (!sa) return null;

  // Try known test passwords
  for (const p of ['Super123!', 'SuperTest123!', 'Admin123!']) {
    const login = await request('POST', '/auth/login', { email: sa.email, password: p });
    if (login.status === 200 && login.data?.token) return login.data.token;
  }
  return null;
}

async function runTests() {
  console.log('=== TEGS-Learning | Tests Reporting & Exports ===\n');

  const uid = Date.now().toString(36);

  // -----------------------------------------------------------------------
  // 0. Setup : 2 ecoles, admins, module avec questions
  // -----------------------------------------------------------------------
  console.log('--- Setup ---');

  // Bootstrap or reuse superadmin
  const superToken = await getSuperAdminToken(uid);
  assert(!!superToken, 'Superadmin token obtenu');

  // Ecole 1 avec plan "individual" (PDF/Excel actives)
  const school1 = await request('POST', '/tenants', {
    name: 'Ecole Reporting Test',
    code: `RPT-${uid}`,
    address: 'Port-au-Prince',
  }, superToken);
  assert(school1.status === 201, 'Ecole 1 creee');
  const t1 = school1.data.tenant._id;

  const admin1 = await request('POST', '/auth/register', {
    email: `admin-rpt-${uid}@test.edu.ht`,
    password: 'Admin123!',
    firstName: 'Marc',
    lastName: 'Duval',
    role: 'admin_ddene',
    tenant_id: t1,
  });
  assert(admin1.status === 201, 'Admin 1 cree');
  const tok1 = admin1.data.token;

  // Ecole 2 pour isolation
  const school2 = await request('POST', '/tenants', {
    name: 'Ecole Reporting Iso',
    code: `RPI-${uid}`,
    address: 'Cap-Haitien',
  }, superToken);
  assert(school2.status === 201, 'Ecole 2 creee');
  const t2 = school2.data.tenant._id;

  const admin2 = await request('POST', '/auth/register', {
    email: `admin-rpi-${uid}@test.edu.ht`,
    password: 'Admin123!',
    firstName: 'Lucie',
    lastName: 'Jean',
    role: 'admin_ddene',
    tenant_id: t2,
  });
  assert(admin2.status === 201, 'Admin 2 cree');
  const tok2 = admin2.data.token;

  // Creer un module avec structure et questions
  const mod = await request('POST', '/modules', {
    title: 'Module Reporting Test',
    description: 'Test des fonctions reporting',
    language: 'fr',
  }, tok1);
  assert(mod.status === 201, 'Module cree');
  const moduleId = mod.data.module._id;

  // Ajouter la structure
  const struct = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [{ title: 'Section 1', screens: [{ title: 'Ecran Quiz' }] }],
  }, tok1);
  assert(struct.status === 200, 'Structure creee');
  const screenId = struct.data.module.sections[0].screens[0]._id;

  // Ajouter des blocs questions avec duration
  const quizBlocks = [
    {
      type: 'quiz', order: 0,
      data: {
        question: 'Quelle est la capitale de Haiti?',
        options: [
          { text: 'Port-au-Prince', isCorrect: true },
          { text: 'Cap-Haitien', isCorrect: false },
          { text: 'Gonaives', isCorrect: false },
        ],
        points: 10, duration: 2,
      },
    },
    {
      type: 'true_false', order: 1,
      data: {
        statement: 'Haiti est une ile',
        answer: false,
        explanation: 'Haiti partage l ile Hispaniola',
        points: 5, duration: 1,
      },
    },
    {
      type: 'numeric', order: 2,
      data: {
        question: '2 + 3 = ?',
        answer: 5, tolerance: 0,
        points: 5, duration: 1,
      },
    },
  ];

  const saveBlocks = await request('PUT', `/modules/${moduleId}/screens/${screenId}/content`, {
    contentBlocks: quizBlocks,
  }, tok1);
  assert(saveBlocks.status === 200, 'Blocs questions sauvegardes');

  // Activer le partage pour submit-public
  const enableShare = await request('POST', `/modules/${moduleId}/share`, { enabled: true }, tok1);
  assert(enableShare.status === 200, 'Partage active');
  const shareToken = enableShare.data.shareToken;

  // Passer le tenant au plan "individual" pour debloquer PDF/Excel
  const changePlan = await request('PUT', '/subscription/change', {
    plan: 'individual', seats: 5, billingCycle: 'monthly',
  }, tok1);
  assert(changePlan.status === 200, 'Plan change en Individual');

  // -----------------------------------------------------------------------
  // 1. Soumission publique (submit-public)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Soumission publique ---');

  const publicSubmit = await request('POST', '/reporting/submit-public', {
    shareToken,
    studentName: 'Jean Baptiste',
    studentEmail: `jean-${uid}@student.ht`,
    answers: [
      {
        blockId: 'q0', questionType: 'quiz',
        questionText: 'Quelle est la capitale de Haiti?',
        studentAnswer: 'Port-au-Prince', correctAnswer: 'Port-au-Prince',
        isCorrect: true, pointsEarned: 10, maxPoints: 10,
        choices: ['Port-au-Prince', 'Cap-Haitien', 'Gonaives'],
      },
      {
        blockId: 'q1', questionType: 'true_false',
        questionText: 'Haiti est une ile',
        studentAnswer: false, correctAnswer: false,
        isCorrect: true, pointsEarned: 5, maxPoints: 5,
      },
      {
        blockId: 'q2', questionType: 'numeric',
        questionText: '2 + 3 = ?',
        studentAnswer: 4, correctAnswer: 5,
        isCorrect: false, pointsEarned: 0, maxPoints: 5,
      },
    ],
    duration: 'PT3M20S',
  });
  assert(publicSubmit.status === 201, 'Soumission publique 201');
  assert(publicSubmit.data.percentage === 75, 'Score = 75% (15/20)');
  assert(publicSubmit.data.score === '15/20', 'Score brut = 15/20');
  const resultId1 = publicSubmit.data.resultId;
  assert(!!resultId1, 'resultId retourne');

  // Validation : champs manquants
  const badSubmit = await request('POST', '/reporting/submit-public', {
    shareToken,
    studentName: 'Test',
  });
  assert(badSubmit.status === 400, 'Soumission sans answers = 400');

  // Validation : shareToken invalide
  const badToken = await request('POST', '/reporting/submit-public', {
    shareToken: 'invalid-token-xyz',
    studentName: 'Test',
    answers: [{ pointsEarned: 0, maxPoints: 5 }],
  });
  assert(badToken.status === 404, 'shareToken invalide = 404');

  // Second eleve
  const publicSubmit2 = await request('POST', '/reporting/submit-public', {
    shareToken,
    studentName: 'Marie Claire',
    studentEmail: `marie-${uid}@student.ht`,
    answers: [
      {
        blockId: 'q0', questionType: 'quiz',
        questionText: 'Quelle est la capitale de Haiti?',
        studentAnswer: 'Cap-Haitien', correctAnswer: 'Port-au-Prince',
        isCorrect: false, pointsEarned: 0, maxPoints: 10,
      },
      {
        blockId: 'q1', questionType: 'true_false',
        questionText: 'Haiti est une ile',
        studentAnswer: true, correctAnswer: false,
        isCorrect: false, pointsEarned: 0, maxPoints: 5,
      },
      {
        blockId: 'q2', questionType: 'numeric',
        questionText: '2 + 3 = ?',
        studentAnswer: 5, correctAnswer: 5,
        isCorrect: true, pointsEarned: 5, maxPoints: 5,
      },
    ],
  });
  assert(publicSubmit2.status === 201, 'Second eleve soumis');
  assert(publicSubmit2.data.percentage === 25, 'Score 2 = 25%');
  const resultId2 = publicSubmit2.data.resultId;

  // -----------------------------------------------------------------------
  // 2. Soumission authentifiee (submit)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Soumission authentifiee ---');

  const authSubmit = await request('POST', '/reporting/submit', {
    module_id: moduleId,
    answers: [
      {
        blockId: 'q0', questionType: 'quiz',
        questionText: 'Quelle est la capitale de Haiti?',
        studentAnswer: 'Port-au-Prince', correctAnswer: 'Port-au-Prince',
        isCorrect: true, pointsEarned: 10, maxPoints: 10,
      },
      {
        blockId: 'q1', questionType: 'true_false',
        questionText: 'Haiti est une ile',
        studentAnswer: false, correctAnswer: false,
        isCorrect: true, pointsEarned: 5, maxPoints: 5,
      },
      {
        blockId: 'q2', questionType: 'numeric',
        questionText: '2 + 3 = ?',
        studentAnswer: 5, correctAnswer: 5,
        isCorrect: true, pointsEarned: 5, maxPoints: 5,
      },
    ],
    duration: 'PT2M10S',
  }, tok1);
  assert(authSubmit.status === 201, 'Soumission authentifiee 201');
  assert(authSubmit.data.result.percentage === 100, 'Score admin = 100%');

  // Validation : module_id manquant
  const badAuth = await request('POST', '/reporting/submit', {
    answers: [{ pointsEarned: 0, maxPoints: 5 }],
  }, tok1);
  assert(badAuth.status === 400, 'submit sans module_id = 400');

  // -----------------------------------------------------------------------
  // 3. Liste des resultats par module
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Liste des resultats ---');

  const resultsList = await request('GET', `/reporting/results/${moduleId}`, null, tok1);
  assert(resultsList.status === 200, 'Liste resultats 200');
  assert(resultsList.data.results.length >= 2, 'Au moins 2 resultats');
  assert(resultsList.data.stats.total >= 2, 'Stats total >= 2');
  assert(typeof resultsList.data.stats.avgScore === 'number', 'avgScore est un nombre');
  assert(typeof resultsList.data.stats.passed === 'number', 'passed est un nombre');
  assert(typeof resultsList.data.stats.failed === 'number', 'failed est un nombre');

  // Verifier le tri par pourcentage decroissant
  const pcts = resultsList.data.results.map(r => r.percentage);
  const sorted = [...pcts].sort((a, b) => b - a);
  assert(JSON.stringify(pcts) === JSON.stringify(sorted), 'Resultats tries par % decroissant');

  // Champs attendus dans chaque resultat
  const firstResult = resultsList.data.results[0];
  assert(!!firstResult.studentName, 'studentName present');
  assert(typeof firstResult.totalScore === 'number', 'totalScore present');
  assert(typeof firstResult.maxScore === 'number', 'maxScore present');
  assert(typeof firstResult.answersCount === 'number', 'answersCount present');
  assert(typeof firstResult.correctCount === 'number', 'correctCount present');

  // -----------------------------------------------------------------------
  // 4. Detail d'un resultat
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Detail resultat ---');

  const detail = await request('GET', `/reporting/result/${resultId1}`, null, tok1);
  assert(detail.status === 200, 'Detail resultat 200');
  assert(detail.data.studentName === 'Jean Baptiste', 'studentName correct');
  assert(detail.data.answers.length === 3, '3 reponses detaillees');
  assert(detail.data.answers[0].questionNumber === 1, 'questionNumber = 1');
  assert(detail.data.answers[0].isCorrect === true, 'Q1 correcte');
  assert(detail.data.answers[2].isCorrect === false, 'Q3 incorrecte');

  // Resultat inexistant
  const badDetail = await request('GET', '/reporting/result/000000000000000000000000', null, tok1);
  assert(badDetail.status === 404, 'Resultat inexistant = 404');

  // -----------------------------------------------------------------------
  // 5. Generation PDF (feature-gated)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : PDF ---');

  const pdfRes = await request('GET', `/reporting/pdf/${resultId1}?token=${tok1}`);
  assert(pdfRes.status === 200, 'PDF genere 200');
  assert(pdfRes.contentType.includes('application/pdf'), 'Content-Type = application/pdf');

  // -----------------------------------------------------------------------
  // 6. Export Excel (feature-gated)
  // -----------------------------------------------------------------------
  console.log('\n--- Test 6 : Excel ---');

  const excelRes = await request('GET', `/reporting/excel/${moduleId}?token=${tok1}`);
  assert(excelRes.status === 200, 'Excel genere 200');
  assert(
    excelRes.contentType.includes('spreadsheet') || excelRes.contentType.includes('octet-stream'),
    'Content-Type = spreadsheet'
  );

  // -----------------------------------------------------------------------
  // 7. Module timer
  // -----------------------------------------------------------------------
  console.log('\n--- Test 7 : Module timer ---');

  // Timer par question (somme des durees)
  const timerRes = await request('GET', `/reporting/module-timer/${moduleId}`, null, tok1);
  assert(timerRes.status === 200, 'Timer 200');
  assert(timerRes.data.source === 'questions', 'Source = questions');
  assert(timerRes.data.totalMinutes === 4, 'Total = 4 min (2+1+1)');
  assert(timerRes.data.totalSeconds === 240, 'Total = 240 secondes');
  assert(timerRes.data.breakdown.length === 3, '3 questions avec duree');

  // Timer global (defini sur le module)
  const setGlobal = await request('PUT', `/modules/${moduleId}`, { globalTimeLimit: 30 }, tok1);
  assert(setGlobal.status === 200, 'globalTimeLimit defini');

  const timerGlobal = await request('GET', `/reporting/module-timer/${moduleId}`, null, tok1);
  assert(timerGlobal.data.source === 'global', 'Source = global');
  assert(timerGlobal.data.totalMinutes === 30, 'Global = 30 min');
  assert(timerGlobal.data.breakdown.length === 0, 'Pas de breakdown en mode global');

  // Remettre sans global
  await request('PUT', `/modules/${moduleId}`, { globalTimeLimit: 0 }, tok1);

  // Timer vide (module sans questions)
  const mod2 = await request('POST', '/modules', {
    title: 'Module Vide', description: 'Pas de questions', language: 'fr',
  }, tok1);
  const emptyModId = mod2.data.module._id;
  const timerEmpty = await request('GET', `/reporting/module-timer/${emptyModId}`, null, tok1);
  assert(timerEmpty.data.source === 'none', 'Source = none pour module vide');
  assert(timerEmpty.data.totalMinutes === 0, 'Total = 0');

  // -----------------------------------------------------------------------
  // 8. Feature gate : plan free bloque PDF/Excel
  // -----------------------------------------------------------------------
  console.log('\n--- Test 8 : Feature gate (plan free) ---');

  // Ecole 2 est en plan free par defaut
  // Creer un module + resultat dans ecole 2
  const mod3 = await request('POST', '/modules', {
    title: 'Module Free Test', description: 'Test plan free', language: 'fr',
  }, tok2);
  const modId3 = mod3.data.module._id;

  // Soumettre un resultat
  const submitFree = await request('POST', '/reporting/submit', {
    module_id: modId3,
    answers: [{
      blockId: 'q0', questionType: 'quiz',
      questionText: 'Test?', studentAnswer: 'A', correctAnswer: 'A',
      isCorrect: true, pointsEarned: 5, maxPoints: 5,
    }],
  }, tok2);
  assert(submitFree.status === 201, 'Resultat cree dans ecole 2');
  const freeResultId = submitFree.data.result._id;

  // PDF bloque en plan free
  const pdfFree = await request('GET', `/reporting/pdf/${freeResultId}?token=${tok2}`);
  assert(pdfFree.status === 403, 'PDF bloque en plan free (403)');
  assert(pdfFree.data.upgradeRequired === true, 'upgradeRequired = true');

  // Excel bloque en plan free
  const excelFree = await request('GET', `/reporting/excel/${modId3}?token=${tok2}`);
  assert(excelFree.status === 403, 'Excel bloque en plan free (403)');

  // Mais les resultats restent accessibles
  const resultsFree = await request('GET', `/reporting/results/${modId3}`, null, tok2);
  assert(resultsFree.status === 200, 'Resultats accessibles en plan free');

  // -----------------------------------------------------------------------
  // 9. Isolation multi-tenant
  // -----------------------------------------------------------------------
  console.log('\n--- Test 9 : Isolation multi-tenant ---');

  // Admin ecole 2 ne voit pas les resultats de ecole 1
  const crossResults = await request('GET', `/reporting/results/${moduleId}`, null, tok2);
  assert(
    crossResults.status === 200 && crossResults.data.results.length === 0,
    'Admin ecole 2 ne voit pas les resultats ecole 1'
  );

  // Admin ecole 2 ne peut pas acceder au detail ecole 1
  const crossDetail = await request('GET', `/reporting/result/${resultId1}`, null, tok2);
  assert(crossDetail.status === 404, 'Detail resultat ecole 1 = 404 pour ecole 2');

  // Admin ecole 1 ne voit pas les resultats ecole 2
  const crossResults2 = await request('GET', `/reporting/results/${modId3}`, null, tok1);
  assert(
    crossResults2.status === 200 && crossResults2.data.results.length === 0,
    'Admin ecole 1 ne voit pas les resultats ecole 2'
  );

  // -----------------------------------------------------------------------
  // 10. Upsert : re-soumission remplace les anciens resultats
  // -----------------------------------------------------------------------
  console.log('\n--- Test 10 : Upsert re-soumission ---');

  const reSubmit = await request('POST', '/reporting/submit-public', {
    shareToken,
    studentName: 'Jean Baptiste',
    studentEmail: `jean-${uid}@student.ht`,
    answers: [
      {
        blockId: 'q0', questionType: 'quiz',
        questionText: 'Quelle est la capitale de Haiti?',
        studentAnswer: 'Port-au-Prince', correctAnswer: 'Port-au-Prince',
        isCorrect: true, pointsEarned: 10, maxPoints: 10,
      },
      {
        blockId: 'q1', questionType: 'true_false',
        questionText: 'Haiti est une ile',
        studentAnswer: false, correctAnswer: false,
        isCorrect: true, pointsEarned: 5, maxPoints: 5,
      },
      {
        blockId: 'q2', questionType: 'numeric',
        questionText: '2 + 3 = ?',
        studentAnswer: 5, correctAnswer: 5,
        isCorrect: true, pointsEarned: 5, maxPoints: 5,
      },
    ],
  });
  assert(reSubmit.status === 201, 'Re-soumission acceptee');
  assert(reSubmit.data.percentage === 100, 'Nouveau score = 100%');

  // Verifier que le nombre de resultats n'a pas change (upsert)
  const afterUpsert = await request('GET', `/reporting/results/${moduleId}`, null, tok1);
  const jeanResults = afterUpsert.data.results.filter(r => r.studentName === 'Jean Baptiste');
  assert(jeanResults.length === 1, 'Un seul resultat pour Jean (upsert)');
  assert(jeanResults[0].percentage === 100, 'Score mis a jour a 100%');

  // -----------------------------------------------------------------------
  // 11. Zero regression
  // -----------------------------------------------------------------------
  console.log('\n--- Test 11 : Zero regression ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health OK');

  const login = await request('POST', '/auth/login', {
    email: `admin-rpt-${uid}@test.edu.ht`,
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
    console.log('\n  [SUCCES] Reporting & Exports valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  console.error('Assurez-vous que le backend est demarre et MongoDB accessible.');
  process.exit(1);
});
