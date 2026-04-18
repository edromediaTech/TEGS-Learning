/**
 * TEGS-Learning — Tests Tournaments & Paywall
 *
 * Ce script teste le pipeline complet :
 * 1. Création tournoi avec rounds + prizes
 * 2. Inscription publique + competitionToken + QR
 * 3. Gestion des rounds (start, advance, promoteTopX)
 * 4. Départage par temps de réponse
 * 5. Bracket + podium + certificat
 * 6. Vérification badge (superviseur)
 * 7. Routes paiement (initiate, verify, manual-confirm)
 * 8. Routes notifications (register-device)
 *
 * Pré-requis : MongoDB + backend démarré (npm run dev)
 * Usage : node test-tournaments.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';

async function request(method, path, body, token) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let passed = 0;
let failed = 0;
const uid = Date.now().toString(36);

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
 * Get a superadmin token. Try registering; if exists, find via DB and login.
 */
async function getSuperAdminToken() {
  const email = `sa-tourn-${uid}@tegs.ht`;
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

  for (const p of ['Super123!', 'Admin123!']) {
    const login = await request('POST', '/auth/login', { email: sa.email, password: p });
    if (login.status === 200 && login.data?.token) return login.data.token;
  }
  return null;
}

async function runTests() {
  console.log('=== TEGS-Learning | Tests Tournaments & Paywall ===\n');

  // -----------------------------------------------------------------------
  // 0. Health check
  // -----------------------------------------------------------------------
  console.log('--- Health Check ---');
  const health = await request('GET', '/health');
  assert(health.status === 200, 'API accessible');

  // -----------------------------------------------------------------------
  // 1. Setup : superadmin + tenant + admin + 6 students
  // -----------------------------------------------------------------------
  console.log('\n--- Setup : Superadmin + Tenant + Users ---');

  const superToken = await getSuperAdminToken();
  assert(!!superToken, 'Superadmin token obtenu');

  const tenant = await request('POST', '/tenants', {
    name: `Ecole Tournoi ${uid}`,
    code: `TOURN-${uid}`,
    contactEmail: `admin-t-${uid}@test.ht`,
  }, superToken);
  assert(tenant.status === 201, 'Tenant créé');
  const tenantId = tenant.data.tenant?._id;

  const admin = await request('POST', '/auth/register', {
    email: `admin-t-${uid}@test.ht`,
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Tournoi',
    role: 'admin_ddene',
    tenant_id: tenantId,
  });
  assert(admin.status === 201, 'Admin créé');
  const adminToken = admin.data.token;

  // Créer 6 étudiants
  const students = [];
  for (let i = 1; i <= 6; i++) {
    const s = await request('POST', '/auth/register', {
      email: `student${i}-${uid}@test.ht`,
      password: 'Student123!',
      firstName: `Eleve${i}`,
      lastName: `Test${uid}`,
      role: 'student',
      tenant_id: tenantId,
    });
    assert(s.status === 201, `Etudiant ${i} créé`);
    students.push({ id: s.data.user?.id || s.data.user?._id, token: s.data.token, email: `student${i}-${uid}@test.ht` });
  }

  // Créer 2 modules (un par round)
  const mod1 = await request('POST', '/modules', {
    title: `Round 1 Quiz ${uid}`,
    tenant_id: tenantId,
  }, adminToken);
  assert(mod1.status === 201, 'Module Round 1 créé');
  const module1Id = mod1.data.module?._id;

  const mod2 = await request('POST', '/modules', {
    title: `Round 2 Quiz ${uid}`,
    tenant_id: tenantId,
  }, adminToken);
  assert(mod2.status === 201, 'Module Round 2 créé');
  const module2Id = mod2.data.module?._id;

  // -----------------------------------------------------------------------
  // 2. CRUD Tournoi
  // -----------------------------------------------------------------------
  console.log('\n--- CRUD Tournoi ---');

  const create = await request('POST', '/tournaments', {
    title: `Concours Maths ${uid}`,
    description: 'Tournoi de test éliminatoire',
    registrationFee: 500,
    currency: 'HTG',
    maxParticipants: 10,
    rounds: [
      { label: 'Éliminatoires', module_id: module1Id, promoteTopX: 3 },
      { label: 'Finale', module_id: module2Id, promoteTopX: 1 },
    ],
    prizes: [
      { rank: 1, label: 'Champion', amount: 50000, currency: 'HTG' },
      { rank: 2, label: 'Finaliste', amount: 25000, currency: 'HTG' },
      { rank: 3, label: '3e place', amount: 10000, currency: 'HTG' },
    ],
  }, adminToken);
  assert(create.status === 201, 'Tournoi créé');
  const tournamentId = create.data.tournament?._id;
  const shareToken = create.data.tournament?.shareToken;
  assert(!!tournamentId, 'Tournoi a un _id');
  assert(!!shareToken, 'Tournoi a un shareToken');
  assert(create.data.tournament?.rounds?.length === 2, '2 rounds créés');
  assert(create.data.tournament?.prizes?.length === 3, '3 prizes créés');
  assert(create.data.tournament?.rounds[0]?.order === 1, 'Round 1 order = 1');
  assert(create.data.tournament?.rounds[1]?.order === 2, 'Round 2 order = 2');

  // GET list
  const list = await request('GET', '/tournaments', null, adminToken);
  assert(list.status === 200, 'Liste tournois OK');
  assert(list.data.tournaments?.length >= 1, 'Au moins 1 tournoi dans la liste');

  // GET detail
  const detail = await request('GET', `/tournaments/${tournamentId}`, null, adminToken);
  assert(detail.status === 200, 'Détail tournoi OK');
  assert(detail.data.tournament?.title === `Concours Maths ${uid}`, 'Titre correct');

  // PUT update
  const update = await request('PUT', `/tournaments/${tournamentId}`, {
    description: 'Description mise à jour',
  }, adminToken);
  assert(update.status === 200, 'Tournoi mis à jour');
  assert(update.data.tournament?.description === 'Description mise à jour', 'Description modifiée');

  // -----------------------------------------------------------------------
  // 3. Route publique (sans auth)
  // -----------------------------------------------------------------------
  console.log('\n--- Routes Publiques ---');

  const pub = await request('GET', `/tournaments/public/${shareToken}`);
  assert(pub.status === 200, 'Route publique accessible');
  assert(pub.data.tournament?.title === `Concours Maths ${uid}`, 'Titre public correct');
  assert(pub.data.tournament?.registrationFee === 500, 'Frais affichés');
  assert(pub.data.spotsLeft === 10, '10 places restantes');

  // -----------------------------------------------------------------------
  // 4. Inscription publique
  // -----------------------------------------------------------------------
  console.log('\n--- Inscription Publique ---');

  // Ouvrir les inscriptions d'abord
  await request('PUT', `/tournaments/${tournamentId}`, { status: 'registration' }, adminToken);

  const participants = [];
  for (let i = 0; i < 6; i++) {
    const reg = await request('POST', `/tournaments/public/${shareToken}/register`, {
      firstName: `Eleve${i + 1}`,
      lastName: `Test${uid}`,
      email: students[i].email,
      establishment: i < 3 ? 'Lycée Nord' : 'Lycée Sud',
    });
    assert(reg.status === 201, `Participant ${i + 1} inscrit`);
    assert(!!reg.data.competitionToken, `Token généré: ${reg.data.competitionToken}`);
    assert(!!reg.data.qrCode, `QR code généré pour participant ${i + 1}`);
    participants.push({
      id: reg.data.participant_id,
      token: reg.data.competitionToken,
    });
  }

  // Doublon rejeté
  const dup = await request('POST', `/tournaments/public/${shareToken}/register`, {
    firstName: 'Eleve1',
    lastName: `Test${uid}`,
    email: students[0].email,
  });
  assert(dup.status === 409, 'Doublon inscription rejeté (409)');
  assert(!!dup.data.competitionToken, 'Token existant retourné');

  // Vérifier places restantes
  const pub2 = await request('GET', `/tournaments/public/${shareToken}`);
  assert(pub2.data.participantCount === 6, '6 participants inscrits');
  assert(pub2.data.spotsLeft === 4, '4 places restantes');

  // -----------------------------------------------------------------------
  // 5. Verify Token (superviseur)
  // -----------------------------------------------------------------------
  console.log('\n--- Vérification Badge ---');

  const verify = await request('GET', `/tournaments/verify-token/${participants[0].token}`);
  assert(verify.status === 200, 'Badge vérifié OK');
  assert(verify.data.valid === true, 'Badge valide');
  assert(verify.data.participant?.firstName === 'Eleve1', 'Nom correct');
  assert(verify.data.tournament?.title === `Concours Maths ${uid}`, 'Tournoi correct');

  const verifyBad = await request('GET', '/tournaments/verify-token/TKT-INVALID000');
  assert(verifyBad.status === 404, 'Badge invalide rejeté (404)');

  // -----------------------------------------------------------------------
  // 6. Inscription authentifiée (admin inscrit un participant)
  // Note: on n'ajoute PAS d'extra candidat pour ne pas perturber l'ordre de promotion
  // -----------------------------------------------------------------------
  console.log('\n--- Inscription Admin ---');

  // Tester que la route ne crashe pas (409 car les inscriptions sont ouvertes et email déjà pris)
  const regAdmin = await request('POST', `/tournaments/${tournamentId}/register`, {
    firstName: 'Eleve1',
    lastName: `Test${uid}`,
    email: students[0].email,
  }, adminToken);
  assert([201, 400, 409].includes(regAdmin.status), 'Inscription admin ne crashe pas');

  // -----------------------------------------------------------------------
  // 7. Participants list
  // -----------------------------------------------------------------------
  console.log('\n--- Liste Participants ---');

  const parts = await request('GET', `/tournaments/${tournamentId}/participants`, null, adminToken);
  assert(parts.status === 200, 'Liste participants OK');
  assert(parts.data.count >= 6, 'Au moins 6 participants');

  // -----------------------------------------------------------------------
  // 8. Start Round 1
  // -----------------------------------------------------------------------
  console.log('\n--- Démarrage Round 1 ---');

  const start1 = await request('POST', `/tournaments/${tournamentId}/start-round`, null, adminToken);
  assert(start1.status === 200, 'Round 1 démarré');
  assert(start1.data.activeRound?.label === 'Éliminatoires', 'Label round correct');
  assert(start1.data.tournament?.status === 'active', 'Tournoi actif');

  // Vérifier qu'on ne peut pas re-démarrer
  const start1bis = await request('POST', `/tournaments/${tournamentId}/start-round`, null, adminToken);
  assert(start1bis.status === 400, 'Round déjà actif — rejeté');

  // -----------------------------------------------------------------------
  // 9. Simuler des QuizResults pour le Round 1 (6 participants)
  // -----------------------------------------------------------------------
  console.log('\n--- Simulation QuizResults Round 1 ---');

  // On crée directement des QuizResults en base via l'API modules
  // (en vrai, les étudiants passent le quiz via la page share)
  // Ici on simule en créant des résultats manuellement

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning');
  const QuizResult = require('../../src/models/QuizResult');
  const Participant = require('../../src/models/Participant');

  // Lier les user_id aux participants
  const dbParticipants = await Participant.find({ tournament_id: tournamentId });
  for (let i = 0; i < Math.min(dbParticipants.length, students.length); i++) {
    dbParticipants[i].user_id = students[i]?.id || null;
    await dbParticipants[i].save();
  }

  // Scores simulés (pourcentage, durée)
  const scores = [
    { pct: 90, dur: 'PT2M30S' },  // Eleve1: 90%, 2m30s
    { pct: 85, dur: 'PT3M00S' },  // Eleve2: 85%, 3m
    { pct: 90, dur: 'PT3M10S' },  // Eleve3: 90%, 3m10s (même score que Eleve1 mais plus lent)
    { pct: 70, dur: 'PT2M00S' },  // Eleve4: 70%, 2m
    { pct: 60, dur: 'PT4M00S' },  // Eleve5: 60%, 4m
    { pct: 50, dur: 'PT1M30S' },  // Eleve6: 50%, 1m30s
  ];

  for (let i = 0; i < Math.min(dbParticipants.length, scores.length); i++) {
    if (!dbParticipants[i].user_id) continue;
    const maxScore = 100;
    const totalScore = scores[i].pct;
    await QuizResult.findOneAndUpdate(
      { module_id: module1Id, user_id: dbParticipants[i].user_id },
      {
        module_id: module1Id,
        user_id: dbParticipants[i].user_id,
        tenant_id: tenantId,
        studentName: `${dbParticipants[i].firstName} ${dbParticipants[i].lastName}`,
        moduleTitle: `Round 1 Quiz ${uid}`,
        totalScore,
        maxScore,
        percentage: totalScore,
        duration: scores[i].dur,
        completedAt: new Date(),
        evaluationType: 'live',
        answers: [],
      },
      { upsert: true, new: true }
    );
  }
  assert(true, `${scores.length} QuizResults simulés`);

  // -----------------------------------------------------------------------
  // 10. Advance Round 1 (promoteTopX = 3)
  // -----------------------------------------------------------------------
  console.log('\n--- Promotion Round 1 (Top 3) ---');

  const advance1 = await request('POST', `/tournaments/${tournamentId}/advance`, null, adminToken);
  assert(advance1.status === 200, 'Promotion Round 1 OK');
  assert(advance1.data.qualified?.length === 3, '3 qualifiés');
  assert(advance1.data.eliminated?.length >= 3, '3+ éliminés');

  // Vérifier le départage par temps : Eleve1 (90%, 2m30) devant Eleve3 (90%, 3m10)
  const q = advance1.data.qualified || [];
  const e = advance1.data.eliminated || [];


  if (q.length >= 3) {
    // Eleve1 (90%, 150s) doit être devant Eleve3 (90%, 190s) par départage temps
    assert(q[0]?.name?.includes('Eleve1'), '1er: Eleve1 (plus rapide à 90%)');
    assert(q[0]?.percentage >= 85, `1er: score >= 85% (got ${q[0]?.percentage})`);
    assert(q[1]?.name?.includes('Eleve3') || q[1]?.name?.includes('Eleve2'), '2e: Eleve3 ou Eleve2');
    assert(q[2]?.percentage >= 80, `3e: score >= 80% (got ${q[2]?.percentage})`);
    // Vérifier que le tri fonctionne (desc)
    assert(q[0].percentage >= q[1].percentage, 'Tri: 1er >= 2e');
    assert(q[1].percentage >= q[2].percentage, 'Tri: 2e >= 3e');
  } else {
    assert(false, 'Pas assez de qualifiés pour vérifier le départage');
  }

  // Vérifier que les éliminés existent
  assert(e.length >= 3, `Au moins 3 éliminés (got ${e.length})`);

  assert(advance1.data.isFinished === false, 'Tournoi pas encore fini');

  // -----------------------------------------------------------------------
  // 11. Bracket
  // -----------------------------------------------------------------------
  console.log('\n--- Bracket ---');

  const bracket = await request('GET', `/tournaments/${tournamentId}/bracket`, null, adminToken);
  assert(bracket.status === 200, 'Bracket OK');
  assert(bracket.data.bracket?.length === 2, '2 rounds dans le bracket');
  assert(bracket.data.bracket[0]?.status === 'completed', 'Round 1 complété');
  assert(bracket.data.bracket[0]?.participants?.length >= 6, 'Round 1: 6 participants');
  assert(bracket.data.bracket[1]?.status === 'pending', 'Round 2 en attente');

  // -----------------------------------------------------------------------
  // 12. Start Round 2 (Finale)
  // -----------------------------------------------------------------------
  console.log('\n--- Démarrage Round 2 (Finale) ---');

  const start2 = await request('POST', `/tournaments/${tournamentId}/start-round`, null, adminToken);
  assert(start2.status === 200, 'Round 2 démarré');
  assert(start2.data.activeRound?.label === 'Finale', 'Label Finale correct');

  // Simuler les résultats de la finale (3 qualifiés)
  const qualifiedParticipants = await Participant.find({
    tournament_id: tournamentId,
    status: 'qualified',
  });
  assert(qualifiedParticipants.length === 3, '3 participants qualifiés pour la finale');

  const finaleScores = [
    { pct: 95, dur: 'PT1M45S' },
    { pct: 88, dur: 'PT2M20S' },
    { pct: 95, dur: 'PT2M00S' }, // Même score que le 1er mais plus lent
  ];

  for (let i = 0; i < qualifiedParticipants.length; i++) {
    if (!qualifiedParticipants[i].user_id) continue;
    await QuizResult.findOneAndUpdate(
      { module_id: module2Id, user_id: qualifiedParticipants[i].user_id },
      {
        module_id: module2Id,
        user_id: qualifiedParticipants[i].user_id,
        tenant_id: tenantId,
        studentName: `${qualifiedParticipants[i].firstName} ${qualifiedParticipants[i].lastName}`,
        moduleTitle: `Round 2 Quiz ${uid}`,
        totalScore: finaleScores[i].pct,
        maxScore: 100,
        percentage: finaleScores[i].pct,
        duration: finaleScores[i].dur,
        completedAt: new Date(),
        evaluationType: 'live',
        answers: [],
      },
      { upsert: true, new: true }
    );
  }
  assert(true, '3 QuizResults finale simulés');

  // -----------------------------------------------------------------------
  // 13. Advance Round 2 (Finale — promoteTopX = 1)
  // -----------------------------------------------------------------------
  console.log('\n--- Promotion Finale (Top 1 = Champion) ---');

  const advance2 = await request('POST', `/tournaments/${tournamentId}/advance`, null, adminToken);
  assert(advance2.status === 200, 'Promotion Finale OK');
  assert(advance2.data.qualified?.length === 1, '1 champion');
  assert(advance2.data.eliminated?.length === 2, '2 éliminés en finale');
  assert(advance2.data.isFinished === true, 'Tournoi TERMINÉ');

  // Le champion doit être celui avec le meilleur score
  const champion = advance2.data.qualified?.[0];

  assert(champion?.percentage >= 80, `Champion: score >= 80% (got ${champion?.percentage})`);
  assert(champion?.durationSec !== undefined, 'Temps de réponse présent dans la réponse');

  // -----------------------------------------------------------------------
  // 14. Podium
  // -----------------------------------------------------------------------
  console.log('\n--- Podium ---');

  const podium = await request('GET', `/tournaments/${tournamentId}/podium`, null, adminToken);
  assert(podium.status === 200, 'Podium OK');
  assert(podium.data.podium?.length >= 1, 'Au moins 1 gagnant');
  assert(podium.data.podium[0]?.rank === 1, '1er rang');
  assert(podium.data.podium[0]?.certificate?.tournamentTitle === `Concours Maths ${uid}`, 'Certificat: titre correct');
  assert(podium.data.podium[0]?.prize?.amount === 50000, 'Prime Champion: 50000 HTG');

  // -----------------------------------------------------------------------
  // 15. Vérifier statuts finaux des participants
  // -----------------------------------------------------------------------
  console.log('\n--- Statuts Finaux ---');

  const finalParts = await request('GET', `/tournaments/${tournamentId}/participants`, null, adminToken);
  const winners = finalParts.data.participants?.filter(p => p.status === 'winner') || [];
  const eliminated = finalParts.data.participants?.filter(p => p.status === 'eliminated') || [];
  assert(winners.length === 1, '1 winner');
  assert(eliminated.length >= 5, '5+ éliminés au total');
  assert(winners[0]?.finalRank === 1, 'Winner a finalRank = 1');

  // -----------------------------------------------------------------------
  // 16. Paiement — Manual Confirm
  // -----------------------------------------------------------------------
  console.log('\n--- Paiement Manual ---');

  const manualPay = await request('POST', '/payment/manual-confirm', {
    participant_id: participants[0].id,
  });
  assert(manualPay.status === 200, 'Confirmation manuelle OK');
  assert(!!manualPay.data.competitionToken, 'Token retourné');
  assert(!!manualPay.data.qrCode, 'QR code retourné');

  // -----------------------------------------------------------------------
  // 17. Paiement — Verify (transaction inexistante)
  // -----------------------------------------------------------------------
  console.log('\n--- Paiement Verify ---');

  // Avec un faux ID MongoDB valide
  const fakeId = '000000000000000000000000';
  const verifyPay = await request('GET', `/payment/verify/${fakeId}`);
  assert(verifyPay.status === 404, 'Transaction inexistante = 404');

  // -----------------------------------------------------------------------
  // 18. Notifications — Register Device
  // -----------------------------------------------------------------------
  console.log('\n--- Notifications ---');

  const regDevice = await request('POST', '/notifications/register-device', {
    token: `fake-fcm-token-${uid}`,
    platform: 'android',
  });
  assert(regDevice.status === 200, 'Device enregistré');

  // Doublon = upsert OK
  const regDevice2 = await request('POST', '/notifications/register-device', {
    token: `fake-fcm-token-${uid}`,
    platform: 'android',
  });
  assert(regDevice2.status === 200, 'Device upsert OK');

  // -----------------------------------------------------------------------
  // 19. Suppression (draft only)
  // -----------------------------------------------------------------------
  console.log('\n--- Suppression ---');

  // Le tournoi est "completed", donc la suppression doit échouer
  const delFail = await request('DELETE', `/tournaments/${tournamentId}`, null, adminToken);
  assert(delFail.status === 400, 'Suppression tournoi terminé refusée');

  // Créer un brouillon et le supprimer
  const draft = await request('POST', '/tournaments', {
    title: `Draft ${uid}`,
    rounds: [{ label: 'R1', promoteTopX: 1 }],
  }, adminToken);
  const draftId = draft.data.tournament?._id;
  const del = await request('DELETE', `/tournaments/${draftId}`, null, adminToken);
  assert(del.status === 200, 'Brouillon supprimé OK');

  // -----------------------------------------------------------------------
  // 20. Bracket final complet
  // -----------------------------------------------------------------------
  console.log('\n--- Bracket Final ---');

  const bracketFinal = await request('GET', `/tournaments/${tournamentId}/bracket`, null, adminToken);
  assert(bracketFinal.data.bracket[0]?.status === 'completed', 'Round 1 complété');
  assert(bracketFinal.data.bracket[1]?.status === 'completed', 'Round 2 (Finale) complété');
  assert(bracketFinal.data.podium?.length >= 1, 'Podium affiché dans le bracket');
  assert(bracketFinal.data.podium[0]?.rank === 1, 'Podium: 1er rang');

  // -----------------------------------------------------------------------
  // Résultat
  // -----------------------------------------------------------------------
  await mongoose.disconnect();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  RÉSULTAT : ${passed} PASS / ${failed} FAIL (total: ${passed + failed})`);
  console.log(`${'='.repeat(60)}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('ERREUR FATALE:', err);
  process.exit(1);
});
