/**
 * TEGS Arena — Module Demo "Culture et Excellence Haitienne"
 *
 * Ce script cree un module complet de demonstration avec :
 * - 10 questions variees sur Haiti (QCM, vrai/faux, numerique, texte a trous, sequence, matching)
 * - Mode contest active avec timer global
 * - Partage public active
 * - 5 participants simules avec des scores varies
 *
 * Pre-requis : MongoDB + backend demarre (port 3000)
 * Usage : node demo-inauguration.js
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
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function getSuperAdminToken() {
  const email = 'sa-demo@tegs.ht';
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

// =========================================================================
// Questions : Culture et Excellence Haitienne
// =========================================================================
const QUESTIONS = [
  // --- Ecran 1 : Histoire ---
  {
    type: 'quiz', order: 0,
    data: {
      question: 'En quelle annee Haiti a-t-elle proclame son independance, devenant la premiere republique noire libre du monde?',
      options: [
        { text: '1791', isCorrect: false },
        { text: '1804', isCorrect: true },
        { text: '1825', isCorrect: false },
        { text: '1776', isCorrect: false },
      ],
      explanation: 'Haiti a proclame son independance le 1er janvier 1804, apres la Revolution menee par Toussaint Louverture, Jean-Jacques Dessalines et d\'autres heros nationaux.',
      points: 10, duration: 20,
    },
  },
  {
    type: 'quiz', order: 1,
    data: {
      question: 'Qui est le pere fondateur de la nation haitienne, proclamateur de l\'independance?',
      options: [
        { text: 'Toussaint Louverture', isCorrect: false },
        { text: 'Jean-Jacques Dessalines', isCorrect: true },
        { text: 'Henri Christophe', isCorrect: false },
        { text: 'Alexandre Petion', isCorrect: false },
      ],
      explanation: 'Jean-Jacques Dessalines a proclame l\'independance le 1er janvier 1804 aux Gonaives et est devenu le premier chef d\'Etat d\'Haiti.',
      points: 10, duration: 20,
    },
  },
  // --- Ecran 2 : Geographie ---
  {
    type: 'numeric', order: 2,
    data: {
      question: 'Combien de departements geographiques composent la Republique d\'Haiti?',
      answer: 10, tolerance: 0, unit: 'departements',
      explanation: 'Haiti est divisee en 10 departements : Artibonite, Centre, Grand\'Anse, Nippes, Nord, Nord-Est, Nord-Ouest, Ouest, Sud, Sud-Est.',
      points: 10, duration: 15,
    },
  },
  {
    type: 'true_false', order: 3,
    data: {
      statement: 'Le Pic la Selle, point culminant d\'Haiti, depasse les 2 600 metres d\'altitude.',
      answer: true,
      explanation: 'Le Pic la Selle culmine a 2 680 metres et se trouve dans le massif de la Hotte, departement du Sud-Est.',
      points: 5, duration: 15,
    },
  },
  // --- Ecran 3 : Litterature & Culture ---
  {
    type: 'fill_blank', order: 4,
    data: {
      text: 'Le roman "{{Gouverneurs}} de la Rosee" de Jacques Roumain est considere comme un chef-d\'oeuvre de la litterature haitienne.',
      explanation: 'Publie en 1944, "Gouverneurs de la Rosee" raconte l\'histoire de Manuel, un paysan qui revient au pays pour unir sa communaute autour de l\'eau.',
      points: 10, duration: 25,
    },
  },
  {
    type: 'quiz', order: 5,
    data: {
      question: 'Quel poete haitien est considere comme le pere de l\'indigenisme litteraire, mouvement valorisant la culture creole et africaine?',
      options: [
        { text: 'Oswald Durand', isCorrect: false },
        { text: 'Jacques Roumain', isCorrect: false },
        { text: 'Jean Price-Mars', isCorrect: true },
        { text: 'Rene Depestre', isCorrect: false },
      ],
      explanation: 'Jean Price-Mars, avec son oeuvre "Ainsi parla l\'Oncle" (1928), a fonde le mouvement indigeniste qui rehabilite les traditions vaudou et la culture creole.',
      points: 10, duration: 20,
    },
  },
  // --- Ecran 4 : Patrimoine ---
  {
    type: 'true_false', order: 6,
    data: {
      statement: 'La Citadelle Laferriere, construite par le roi Henri Christophe, est inscrite au patrimoine mondial de l\'UNESCO.',
      answer: true,
      explanation: 'La Citadelle Laferriere (1805-1820) a ete inscrite au patrimoine mondial de l\'UNESCO en 1982. C\'est la plus grande forteresse des Ameriques.',
      points: 5, duration: 15,
    },
  },
  {
    type: 'matching', order: 7,
    data: {
      instruction: 'Associez chaque monument haitien a sa ville.',
      pairs: [
        { left: 'Citadelle Laferriere', right: 'Milot' },
        { left: 'Cathedrale Notre-Dame', right: 'Cap-Haitien' },
        { left: 'Palais Sans-Souci', right: 'Milot' },
        { left: 'Marche en Fer', right: 'Port-au-Prince' },
      ],
      explanation: 'Le Marche en Fer (1891) est un marche public iconique de Port-au-Prince, concu par l\'ingenieur francais Gustave Eiffel.',
      points: 15, duration: 30,
    },
  },
  // --- Ecran 5 : Musique & Gastronomie ---
  {
    type: 'sequence', order: 8,
    data: {
      instruction: 'Classez ces genres musicaux haitiens du plus ancien au plus recent.',
      items: ['Meringue (1800s)', 'Twoubadou (1940s)', 'Kompa (1955)', 'Rasin (1980s)', 'Rap Kreyol (1990s)'],
      explanation: 'La Meringue est le rythme le plus ancien, le Kompa a ete cree par Nemours Jean-Baptiste en 1955, et le mouvement Rasin (Boukman Eksperyans) a emerge dans les annees 1980.',
      points: 15, duration: 30,
    },
  },
  {
    type: 'quiz', order: 9,
    data: {
      question: 'Quel plat est considere comme le "plat national" d\'Haiti, traditionnellement servi le jour de l\'independance (1er janvier)?',
      options: [
        { text: 'Griot avec banane pesee', isCorrect: false },
        { text: 'Soup joumou (soupe au giraumon)', isCorrect: true },
        { text: 'Diri ak djon djon', isCorrect: false },
        { text: 'Legim avec viande', isCorrect: false },
      ],
      explanation: 'La Soup Joumou est servie chaque 1er janvier pour celebrer l\'independance. Sous la colonisation, cette soupe etait reservee aux colons. Sa consommation par les Haitiens libres est un acte symbolique de liberation.',
      points: 10, duration: 20,
    },
  },
];

// =========================================================================
// Participants simules
// =========================================================================
const BOTS = [
  { name: 'Emmanuelle Joseph', email: 'emmanuelle@demo.ht', establishment: 'Lycee Toussaint Louverture', accuracy: 0.9, speed: 'fast' },
  { name: 'Ricardo Michel', email: 'ricardo@demo.ht', establishment: 'College Henri Christophe', accuracy: 0.7, speed: 'medium' },
  { name: 'Naomie Pierre', email: 'naomie@demo.ht', establishment: 'Ecole Nationale Dessalines', accuracy: 0.8, speed: 'fast' },
  { name: 'Jean-Baptiste Alcius', email: 'jb@demo.ht', establishment: 'Lycee du Centenaire', accuracy: 0.5, speed: 'slow' },
  { name: 'Farah Belizaire', email: 'farah@demo.ht', establishment: 'Lycee Toussaint Louverture', accuracy: 0.6, speed: 'medium' },
];

function generateBotAnswers(bot) {
  const answers = [];
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const d = q.data;
    const isCorrect = Math.random() < bot.accuracy;
    let studentAnswer, correctAnswer, maxPoints;

    switch (q.type) {
      case 'quiz':
        correctAnswer = d.options.find(o => o.isCorrect)?.text || d.options[0].text;
        studentAnswer = isCorrect
          ? correctAnswer
          : d.options.find(o => !o.isCorrect)?.text || 'X';
        maxPoints = d.points;
        break;
      case 'true_false':
        correctAnswer = d.answer;
        studentAnswer = isCorrect ? d.answer : !d.answer;
        maxPoints = d.points;
        break;
      case 'numeric':
        correctAnswer = d.answer;
        studentAnswer = isCorrect ? d.answer : d.answer + Math.floor(Math.random() * 5) + 1;
        maxPoints = d.points;
        break;
      case 'fill_blank':
        correctAnswer = 'Gouverneurs';
        studentAnswer = isCorrect ? 'Gouverneurs' : 'Maitres';
        maxPoints = d.points;
        break;
      case 'matching':
        correctAnswer = d.pairs.map(p => `${p.left}→${p.right}`).join(', ');
        studentAnswer = isCorrect ? correctAnswer : 'Partiellement correct';
        maxPoints = d.points;
        break;
      case 'sequence':
        correctAnswer = d.items.join(' → ');
        studentAnswer = isCorrect ? correctAnswer : [...d.items].reverse().join(' → ');
        maxPoints = d.points;
        break;
      default:
        correctAnswer = '?';
        studentAnswer = '?';
        maxPoints = 5;
    }

    answers.push({
      blockId: `q${i}`,
      questionNumber: i + 1,
      questionType: q.type,
      questionText: d.question || d.statement || d.instruction || d.text?.replace(/\{\{.*?\}\}/g, '___') || '',
      studentAnswer,
      correctAnswer,
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
      maxPoints,
      feedback: d.explanation || '',
    });
  }
  return answers;
}

// =========================================================================
// Main
// =========================================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║    TEGS Arena — Inauguration Demo                          ║');
  console.log('║    "Culture et Excellence Haitienne"                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // --- 1. Auth ---
  console.log('[1/6] Authentification...');
  const superToken = await getSuperAdminToken();
  if (!superToken) { console.error('ERREUR: Impossible d\'obtenir un token superadmin.'); process.exit(1); }

  // Get or create a demo tenant
  const uid = 'demo';
  let tenantId, adminToken;

  const schoolRes = await request('POST', '/tenants', {
    name: 'DDENE Nord-Est (Demo)',
    code: 'DDENE-DEMO',
    address: 'Fort-Liberte, Nord-Est',
  }, superToken);

  if (schoolRes.status === 201) {
    tenantId = schoolRes.data.tenant._id;
  } else {
    // Tenant exists — find it
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning');
    const t = await mongoose.connection.collection('tenants').findOne({ code: 'DDENE-DEMO' });
    await mongoose.disconnect();
    tenantId = t?._id?.toString();
  }

  if (!tenantId) { console.error('ERREUR: Impossible de creer le tenant demo.'); process.exit(1); }
  console.log(`  Tenant: ${tenantId}`);

  // Admin for the demo tenant
  const adminReg = await request('POST', '/auth/register', {
    email: 'prof-demo@ddene.edu.ht',
    password: 'Demo2026!',
    firstName: 'Jean-Marc',
    lastName: 'Dumont',
    role: 'admin_ddene',
    tenant_id: tenantId,
  });
  if (adminReg.status === 201) {
    adminToken = adminReg.data.token;
  } else {
    const login = await request('POST', '/auth/login', {
      email: 'prof-demo@ddene.edu.ht',
      password: 'Demo2026!',
      tenant_id: tenantId,
    });
    adminToken = login.data?.token;
  }

  if (!adminToken) { console.error('ERREUR: Impossible d\'obtenir le token admin.'); process.exit(1); }
  console.log('  Admin: prof-demo@ddene.edu.ht');

  // Upgrade to Pro plan
  await request('PUT', '/subscription/change', {
    plan: 'pro', seats: 50, billingCycle: 'annual',
  }, adminToken);
  console.log('  Plan: Pro (toutes fonctionnalites actives)');

  // --- 2. Module ---
  console.log('\n[2/6] Creation du module...');

  // Check if module already exists
  const existing = await request('GET', '/modules', null, adminToken);
  const existingDemo = existing.data?.modules?.find(m => m.title === 'Inauguration TEGS Arena — Culture et Excellence Haitienne');

  let moduleId;
  if (existingDemo) {
    moduleId = existingDemo._id;
    console.log(`  Module existant: ${moduleId}`);
  } else {
    const modRes = await request('POST', '/modules', {
      title: 'Inauguration TEGS Arena — Culture et Excellence Haitienne',
      description: 'Quiz de demonstration pour l\'inauguration de TEGS Arena. 10 questions variees sur l\'histoire, la geographie, la culture et le patrimoine d\'Haiti.',
      language: 'fr',
    }, adminToken);
    moduleId = modRes.data.module._id;
    console.log(`  Module cree: ${moduleId}`);
  }

  // --- 3. Structure + Contenu ---
  console.log('\n[3/6] Configuration du contenu (5 ecrans, 10 questions)...');

  const structRes = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [{
      title: 'Culture et Excellence Haitienne',
      screens: [
        { title: 'Histoire d\'Haiti' },
        { title: 'Geographie' },
        { title: 'Litterature & Culture' },
        { title: 'Patrimoine' },
        { title: 'Musique & Gastronomie' },
      ],
    }],
  }, adminToken);

  const screens = structRes.data.module.sections[0].screens;
  console.log(`  ${screens.length} ecrans crees`);

  // Repartir les questions sur les ecrans (2 par ecran)
  for (let s = 0; s < screens.length; s++) {
    const screenQuestions = QUESTIONS.slice(s * 2, s * 2 + 2).map((q, i) => ({
      ...q, order: i,
    }));
    await request('PUT', `/modules/${moduleId}/screens/${screens[s]._id}/content`, {
      contentBlocks: screenQuestions,
    }, adminToken);
  }
  console.log('  10 questions distribuees sur 5 ecrans');

  // --- 4. Configuration Live Arena ---
  console.log('\n[4/6] Configuration mode Arena...');

  const now = new Date();
  const startTime = new Date(now.getTime() + 2 * 60 * 1000); // dans 2 min
  const endTime = new Date(now.getTime() + 60 * 60 * 1000);  // dans 1 heure

  await request('PUT', `/modules/${moduleId}`, {
    evaluationType: 'live',
    contestMode: true,
    globalTimeLimit: 15,            // 15 minutes
    surveillanceMode: 'strict',
    proctoring: 'snapshot',
    snapshotInterval: 30,
    liveStartTime: startTime.toISOString(),
    liveEndTime: endTime.toISOString(),
    theme: 'ddene',
  }, adminToken);

  console.log('  Mode: Live Arena (Contest)');
  console.log('  Timer: 15 minutes global');
  console.log('  Surveillance: Strict + Snapshots');
  console.log(`  Ouverture: ${startTime.toLocaleTimeString('fr-FR')}`);
  console.log(`  Fermeture: ${endTime.toLocaleTimeString('fr-FR')}`);

  // --- 5. Partage public ---
  console.log('\n[5/6] Activation du partage public...');

  const shareRes = await request('POST', `/modules/${moduleId}/share`, { enabled: true }, adminToken);
  const shareToken = shareRes.data.shareToken;
  const shareUrl = `${PUBLIC_URL}/api/share/public/${shareToken}`;
  console.log(`  Share Token: ${shareToken}`);

  // --- 6. Participants simules ---
  console.log('\n[6/6] Injection des 5 participants simules...');

  for (const bot of BOTS) {
    const answers = generateBotAnswers(bot);
    const totalScore = answers.reduce((s, a) => s + a.pointsEarned, 0);
    const maxScore = answers.reduce((s, a) => s + a.maxPoints, 0);

    const res = await request('POST', '/reporting/submit-public', {
      shareToken,
      studentName: bot.name,
      studentEmail: bot.email,
      answers,
      duration: bot.speed === 'fast' ? 'PT8M' : bot.speed === 'medium' ? 'PT11M' : 'PT14M',
    });

    const pct = res.data?.percentage || 0;
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    console.log(`  ${bot.name.padEnd(25)} ${bar} ${pct}% (${totalScore}/${maxScore})`);
  }

  // =========================================================================
  // Resume
  // =========================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO PRETE !                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                            ║');
  console.log(`║  URL Eleve (Quiz Public):                                  ║`);
  console.log(`║  ${shareUrl}`);
  console.log('║                                                            ║');
  console.log('║  Dashboard Prof:                                           ║');
  console.log(`║  http://localhost:3002/admin/modules/${moduleId}/reporting`);
  console.log('║                                                            ║');
  console.log('║  Live Dashboard:                                           ║');
  console.log(`║  http://localhost:3002/admin/modules/${moduleId}/live`);
  console.log('║                                                            ║');
  console.log('║  Settings:                                                 ║');
  console.log(`║  http://localhost:3002/admin/modules/${moduleId}/settings`);
  console.log('║                                                            ║');
  console.log('║  Connexion Prof:                                           ║');
  console.log('║  Email: prof-demo@ddene.edu.ht                             ║');
  console.log('║  Pass:  Demo2026!                                          ║');
  console.log('║                                                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  process.exit(0);
}

main().catch(err => {
  console.error('\n[ERREUR FATALE]', err.message);
  process.exit(1);
});
