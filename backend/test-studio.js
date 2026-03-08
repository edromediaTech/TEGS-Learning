/**
 * TEGS-Learning - Test Studio Edition (Partie 3)
 *
 * Ce script valide :
 * 1. Nouveaux types de blocs (17 types acceptes par le backend)
 * 2. Themes graphiques (creation module avec theme, changement de theme)
 * 3. Partage module (activer, URL signee, desactiver, lecteur public)
 * 4. Lecteur public HTML avec theme applique
 * 5. Code iframe (JSON endpoint)
 * 6. Securite : partage desactive = 404, isolation multi-tenant
 * 7. Sanitisation XSS sur les nouveaux types
 * 8. Zero regression Sprints 1-6
 *
 * Pre-requis : MongoDB + backend demarre
 * Usage : node test-studio.js
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

async function runTests() {
  console.log('=== TEGS-Learning | Studio Edition - Tests Partie 3 ===\n');

  const uid = Date.now().toString(36);

  // -----------------------------------------------------------------------
  // 0. Setup
  // -----------------------------------------------------------------------
  console.log('--- Setup ---');

  const school = await request('POST', '/tenants', {
    name: 'Ecole Studio Test',
    code: `STU-${uid}`,
    address: 'Port-au-Prince',
  });
  assert(school.status === 201, 'Ecole creee');
  const tenantId = school.data.tenant._id;

  const admin = await request('POST', '/auth/register', {
    email: `admin-stu-${uid}@test.edu.ht`,
    password: 'Admin123!',
    firstName: 'Jean',
    lastName: 'Pierre',
    role: 'admin_ddene',
    tenant_id: tenantId,
  });
  assert(admin.status === 201, 'Admin cree');
  const tok = admin.data.token;

  // Ecole 2 pour isolation
  const school2 = await request('POST', '/tenants', {
    name: 'Ecole Studio Iso',
    code: `STI-${uid}`,
    address: 'Cap-Haitien',
  });
  const t2 = school2.data.tenant._id;
  const admin2 = await request('POST', '/auth/register', {
    email: `admin-sti-${uid}@test.edu.ht`,
    password: 'Admin123!',
    firstName: 'Marie',
    lastName: 'Luc',
    role: 'admin_ddene',
    tenant_id: t2,
  });
  const tok2 = admin2.data.token;

  // -----------------------------------------------------------------------
  // 1. Themes graphiques
  // -----------------------------------------------------------------------
  console.log('\n--- Test 1 : Themes graphiques ---');

  const mod = await request('POST', '/modules', {
    title: 'Module Theme Test',
    description: 'Test des themes',
    language: 'fr',
  }, tok);
  assert(mod.status === 201, 'Module cree');
  const moduleId = mod.data.module._id;

  // Theme par defaut = ddene
  assert(mod.data.module.theme === 'ddene', 'Theme par defaut = ddene');

  // Changer le theme
  const upTheme = await request('PUT', `/modules/${moduleId}`, { theme: 'nature' }, tok);
  assert(upTheme.status === 200, 'Theme change en nature');
  assert(upTheme.data.module.theme === 'nature', 'Theme = nature en base');

  const upTheme2 = await request('PUT', `/modules/${moduleId}`, { theme: 'contrast' }, tok);
  assert(upTheme2.status === 200, 'Theme change en contrast');
  assert(upTheme2.data.module.theme === 'contrast', 'Theme = contrast en base');

  // Theme invalide
  const badTheme = await request('PUT', `/modules/${moduleId}`, { theme: 'invalid_theme' }, tok);
  // Mongoose validator rejects it
  assert(badTheme.status === 500 || badTheme.status === 400, 'Theme invalide rejete');

  // Remettre en ddene
  await request('PUT', `/modules/${moduleId}`, { theme: 'ddene' }, tok);

  // -----------------------------------------------------------------------
  // 2. Nouveaux types de blocs
  // -----------------------------------------------------------------------
  console.log('\n--- Test 2 : Nouveaux types de blocs ---');

  // Creer la structure
  const struct = await request('PUT', `/modules/${moduleId}/structure`, {
    sections: [{ title: 'Chapitre 1', screens: [{ title: 'Ecran test' }] }],
  }, tok);
  assert(struct.status === 200, 'Structure creee');
  const screenId = struct.data.module.sections[0].screens[0]._id;

  // Sauvegarder tous les types de blocs
  const allBlocks = [
    { type: 'heading', order: 0, data: { text: 'Mon Titre', level: 1 } },
    { type: 'text', order: 1, data: { content: 'Paragraphe de test' } },
    { type: 'separator', order: 2, data: { style: 'dashed' } },
    { type: 'image', order: 3, data: { url: 'https://example.com/img.jpg', alt: 'Test', caption: 'Image test', size: 'full' } },
    { type: 'text_image', order: 4, data: { text: 'Texte cote image', imageUrl: 'https://example.com/img2.jpg', layout: 'text-left' } },
    { type: 'video', order: 5, data: { url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', caption: 'Video test' } },
    { type: 'audio', order: 6, data: { url: 'https://example.com/audio.mp3', title: 'Audio test' } },
    { type: 'pdf', order: 7, data: { url: 'https://example.com/doc.pdf', title: 'Document', height: 500 } },
    { type: 'embed', order: 8, data: { url: 'https://example.com/widget', width: 800, height: 500, title: 'Widget' } },
    { type: 'quiz', order: 9, data: { question: 'Combien ?', options: [{ text: '1', isCorrect: true }, { text: '2', isCorrect: false }], explanation: 'Parce que.' } },
    { type: 'true_false', order: 10, data: { statement: 'Haiti est une ile', answer: false, explanation: 'Haiti est sur l ile Hispaniola' } },
    { type: 'numeric', order: 11, data: { question: '2+2=?', answer: 4, tolerance: 0, unit: '', explanation: '4' } },
    { type: 'fill_blank', order: 12, data: { text: 'La capitale est {{Port-au-Prince}}', explanation: '' } },
    { type: 'matching', order: 13, data: { instruction: 'Associez', pairs: [{ left: 'Haiti', right: 'Creole' }, { left: 'France', right: 'Francais' }], explanation: '' } },
    { type: 'sequence', order: 14, data: { instruction: 'Ordonnez', items: ['Premier', 'Deuxieme', 'Troisieme'], explanation: '' } },
    { type: 'likert', order: 15, data: { question: 'Satisfaction ?', scale: 'satisfaction' } },
    { type: 'media', order: 16, data: { url: 'https://example.com/legacy.jpg', mediaType: 'image', caption: 'Legacy' } },
  ];

  const saveBlocks = await request('PUT', `/modules/${moduleId}/screens/${screenId}/content`, {
    contentBlocks: allBlocks,
  }, tok);
  assert(saveBlocks.status === 200, '17 types de blocs sauvegardes');
  assert(saveBlocks.data.screen.contentBlocks.length === 17, '17 blocs en base');

  // Verifier que chaque type est bien sauve
  const savedTypes = saveBlocks.data.screen.contentBlocks.map(b => b.type);
  const expectedTypes = allBlocks.map(b => b.type);
  assert(JSON.stringify(savedTypes.sort()) === JSON.stringify(expectedTypes.sort()), 'Tous les types presents');

  // -----------------------------------------------------------------------
  // 3. Sanitisation XSS nouveaux types
  // -----------------------------------------------------------------------
  console.log('\n--- Test 3 : Sanitisation XSS ---');

  const xssBlocks = [
    { type: 'heading', order: 0, data: { text: '<script>alert("xss")</script>Titre propre', level: 1 } },
    { type: 'true_false', order: 1, data: { statement: '<img onerror=alert(1) src=x>Enonce', answer: true, explanation: 'javascript:void(0)' } },
    { type: 'fill_blank', order: 2, data: { text: '<iframe>hack</iframe>Texte {{reponse}}', explanation: '' } },
  ];

  const xssRes = await request('PUT', `/modules/${moduleId}/screens/${screenId}/content`, {
    contentBlocks: xssBlocks,
  }, tok);
  assert(xssRes.status === 200, 'Blocs XSS acceptes (sanitises)');

  const headingData = xssRes.data.screen.contentBlocks.find(b => b.type === 'heading');
  assert(!headingData.data.text.includes('<script>'), 'XSS script supprime du heading');

  const tfData = xssRes.data.screen.contentBlocks.find(b => b.type === 'true_false');
  assert(!tfData.data.statement.includes('onerror'), 'XSS event handler supprime du true_false');

  const fbData = xssRes.data.screen.contentBlocks.find(b => b.type === 'fill_blank');
  assert(!fbData.data.text.includes('<iframe>'), 'XSS iframe supprime du fill_blank');

  // Restaurer le contenu propre
  await request('PUT', `/modules/${moduleId}/screens/${screenId}/content`, {
    contentBlocks: allBlocks,
  }, tok);

  // -----------------------------------------------------------------------
  // 4. Partage module
  // -----------------------------------------------------------------------
  console.log('\n--- Test 4 : Partage module ---');

  // Etat initial : pas de partage
  const shareInfo = await request('GET', `/modules/${moduleId}/share`, null, tok);
  assert(shareInfo.status === 200, 'Info partage accessible');
  assert(shareInfo.data.shareEnabled === false, 'Partage desactive par defaut');

  // Activer le partage
  const enableShare = await request('POST', `/modules/${moduleId}/share`, { enabled: true }, tok);
  assert(enableShare.status === 200, 'Partage active');
  assert(enableShare.data.shareEnabled === true, 'shareEnabled = true');
  assert(typeof enableShare.data.shareToken === 'string', 'shareToken genere');
  assert(enableShare.data.shareToken.length === 32, 'Token = 32 caracteres (signe)');
  assert(enableShare.data.shareUrl.includes('/api/share/public/'), 'URL publique contient /api/share/public/');
  const shareToken = enableShare.data.shareToken;
  const shareUrl = enableShare.data.shareUrl;

  // -----------------------------------------------------------------------
  // 5. Lecteur public avec theme
  // -----------------------------------------------------------------------
  console.log('\n--- Test 5 : Lecteur public ---');

  // Acces au lecteur public (pas de token d'auth)
  const publicRes = await request('GET', `${PUBLIC_URL}/api/share/public/${shareToken}`);
  assert(publicRes.status === 200, 'Lecteur public accessible (200)');
  assert(publicRes.contentType.includes('text/html'), 'Content-Type = text/html');
  assert(publicRes.data.includes('Module Theme Test'), 'Titre du module present');
  assert(publicRes.data.includes('TEGS-Learning'), 'Branding TEGS-Learning');
  assert(publicRes.data.includes('Ecran test'), 'Navigation ecrans presente');
  assert(publicRes.data.includes('#1e40af'), 'Theme DDENE applique (couleur primaire)');

  // Changer le theme et reverifier
  await request('PUT', `/modules/${moduleId}`, { theme: 'nature' }, tok);
  const publicNature = await request('GET', `${PUBLIC_URL}/api/share/public/${shareToken}`);
  assert(publicNature.data.includes('#166534'), 'Theme Nature applique dans le lecteur');

  // JSON endpoint
  const jsonRes = await request('GET', `${PUBLIC_URL}/api/share/public/${shareToken}/json`);
  assert(jsonRes.status === 200, 'Endpoint JSON public accessible');
  assert(jsonRes.data.title === 'Module Theme Test', 'JSON: titre correct');
  assert(jsonRes.data.theme === 'nature', 'JSON: theme correct');
  assert(jsonRes.data.sections.length === 1, 'JSON: 1 section');

  // -----------------------------------------------------------------------
  // 6. Securite partage
  // -----------------------------------------------------------------------
  console.log('\n--- Test 6 : Securite partage ---');

  // Token invalide = 404
  const badToken = await request('GET', `${PUBLIC_URL}/api/share/public/invalidtoken123`);
  assert(badToken.status === 404, 'Token invalide = 404');

  // Desactiver le partage
  const disableShare = await request('POST', `/modules/${moduleId}/share`, { enabled: false }, tok);
  assert(disableShare.status === 200, 'Partage desactive');
  assert(disableShare.data.shareEnabled === false, 'shareEnabled = false');

  // Lecteur public doit etre inaccessible
  const publicDisabled = await request('GET', `${PUBLIC_URL}/api/share/public/${shareToken}`);
  assert(publicDisabled.status === 404, 'Lecteur public 404 quand desactive');

  // Reactiver
  const reEnable = await request('POST', `/modules/${moduleId}/share`, { enabled: true }, tok);
  assert(reEnable.data.shareToken === shareToken, 'Meme token apres reactivation');

  // -----------------------------------------------------------------------
  // 7. Isolation multi-tenant partage
  // -----------------------------------------------------------------------
  console.log('\n--- Test 7 : Isolation multi-tenant ---');

  // Admin ecole 2 ne peut pas gerer le partage du module ecole 1
  const crossShare = await request('POST', `/modules/${moduleId}/share`, { enabled: false }, tok2);
  assert(crossShare.status === 404, 'Admin ecole 2 ne peut pas modifier partage ecole 1');

  const crossInfo = await request('GET', `/modules/${moduleId}/share`, null, tok2);
  assert(crossInfo.status === 404, 'Admin ecole 2 ne peut pas voir infos partage ecole 1');

  // Mais le lecteur public est accessible par tous (pas d'auth)
  const publicAnon = await request('GET', `${PUBLIC_URL}/api/share/public/${shareToken}`);
  assert(publicAnon.status === 200, 'Lecteur public accessible sans auth');

  // -----------------------------------------------------------------------
  // 8. Zero regression
  // -----------------------------------------------------------------------
  console.log('\n--- Test 8 : Zero regression Sprints 1-6 ---');

  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health OK');

  const login = await request('POST', '/auth/login', {
    email: `admin-stu-${uid}@test.edu.ht`,
    password: 'Admin123!',
    tenant_id: tenantId,
  });
  assert(login.status === 200, 'Login Sprint 1 OK');

  const stmtBasic = await request('POST', '/xapi/statements', {
    verb: { id: 'http://adlnet.gov/expapi/verbs/attempted', display: { 'fr-HT': 'a tente' } },
    object: { id: 'https://tegs-learning.edu.ht/activities/regression-studio' },
  }, tok);
  assert(stmtBasic.status === 201, 'xAPI Sprint 2 OK');

  const mods = await request('GET', '/modules', null, tok);
  assert(mods.status === 200, 'Modules Sprint 3 OK');

  const screenContent = await request('GET', `/modules/${moduleId}/screens/${screenId}`, null, tok);
  assert(screenContent.status === 200, 'Screen content Sprint 4 OK');

  const xmlRes = await request('GET', `/cmi5/manifest/${moduleId}`, null, tok);
  assert(xmlRes.status === 200, 'cmi5.xml Sprint 5 OK');

  // Runtime Sprint 6
  const rtJs = await request('GET', `${PUBLIC_URL}/public/js/tegs-runtime.js`);
  assert(rtJs.status === 200, 'Runtime JS Sprint 6 OK');

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
    console.log('\n  [SUCCES] Studio Partie 3 valide a 100% !');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[ERREUR FATALE]', err.message);
  console.error('Assurez-vous que le backend est demarre et MongoDB accessible.');
  process.exit(1);
});
