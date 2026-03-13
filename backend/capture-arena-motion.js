/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Arena Motion Demo — Capture animee de la Live Arena TV     ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Enregistre une sequence GIF de la competition en direct :  ║
 * ║  Lobby → Countdown → Questions → Reveal → Podium           ║
 * ║  + Dashboard Prof avec monitoring                           ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Pre-requis : backend:3000 + frontend:3002
 * Usage : node capture-arena-motion.js
 */

const puppeteer = require('puppeteer-core');
const { io: ioClient } = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const GIFEncoder = require('gif-encoder-2');

const BACKEND = 'http://localhost:3000';
const FRONTEND = 'http://localhost:3002';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUTPUT_DIR = 'public/assets/demo';
const FRAMES_DIR = 'captures/arena-frames';

const delay = ms => new Promise(r => setTimeout(r, ms));

let TOKEN = '';
let TENANT_ID = '';
let MODULE_ID = '';
let SHARE_TOKEN = '';
let SCREEN_ID = '';

async function request(method, apiPath, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BACKEND}/api${apiPath}`, opts);
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

// ═══════════════════════════════════════════════════════════════
// SETUP : Auth + Module + Arena Config
// ═══════════════════════════════════════════════════════════════
async function setup() {
  console.log('--- Setup ---');

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tegs_learning');

  const tenant = await mongoose.connection.collection('tenants').findOne({
    $or: [{ name: /DDENE/i }, { name: /Demo/i }],
  });
  TENANT_ID = tenant._id.toString();
  await mongoose.connection.collection('tenants').updateOne(
    { _id: tenant._id }, { $set: { plan: 'pro', seats: 100 } }
  );

  // Cleanup old arena demo modules
  await mongoose.connection.collection('modules').deleteMany({
    title: 'Arena Motion Demo', tenant_id: tenant._id,
  });
  await mongoose.disconnect();

  // Login
  const login = await request('POST', '/auth/login', {
    email: 'homologation@ddene.edu.ht',
    password: 'Homolog2026!',
    tenant_id: TENANT_ID,
  });
  if (login.status !== 200) {
    // Register
    const reg = await request('POST', '/auth/register', {
      email: 'homologation@ddene.edu.ht', password: 'Homolog2026!',
      firstName: 'Prof', lastName: 'Demo', role: 'teacher', tenant_id: TENANT_ID,
    });
    TOKEN = reg.data.token;
  } else {
    TOKEN = login.data.token;
  }
  console.log('  [OK] Login');

  // Create module
  const mod = await request('POST', '/modules', {
    title: 'Arena Motion Demo',
    description: 'Concours National — Geographie du Nord-Est d\'Haiti',
  });
  MODULE_ID = mod.data.module._id;
  console.log(`  [OK] Module: ${MODULE_ID}`);

  // Structure
  const struct = await request('PUT', `/modules/${MODULE_ID}/structure`, {
    sections: [{ title: 'Quiz', order: 0, screens: [{ title: 'Questions', order: 0 }] }],
  });
  SCREEN_ID = struct.data.module.sections[0].screens[0]._id;

  // Questions (duration 0.34 min = ~20s each for fast demo)
  await request('PUT', `/modules/${MODULE_ID}/screens/${SCREEN_ID}/content`, {
    contentBlocks: [
      { type: 'quiz', order: 0, data: { question: 'Quelle est la capitale du departement du Nord-Est ?', options: [{ text: 'Fort-Liberte', isCorrect: true }, { text: 'Ouanaminthe', isCorrect: false }, { text: 'Cap-Haitien', isCorrect: false }, { text: 'Hinche', isCorrect: false }], explanation: 'Fort-Liberte est le chef-lieu du departement du Nord-Est.', points: 10, duration: 0.34 }},
      { type: 'true_false', order: 1, data: { statement: 'Le fleuve Massacre marque la frontiere nord entre Haiti et la Republique Dominicaine.', answer: true, explanation: 'Le Massacre separe Ouanaminthe de Dajabon.', points: 10, duration: 0.34 }},
      { type: 'quiz', order: 2, data: { question: 'Quel site naturel est la plus grande baie d\'Haiti ?', options: [{ text: 'Baie de Mancenille', isCorrect: true }, { text: 'Baie de Port-au-Prince', isCorrect: false }, { text: 'Baie de Jacmel', isCorrect: false }, { text: 'Baie des Cayes', isCorrect: false }], explanation: 'La Baie de Mancenille, pres de Fort-Liberte, est la plus grande baie du pays.', points: 10, duration: 0.34 }},
      { type: 'fill_blank', order: 3, data: { text: 'La ville de ___ est le principal point de passage frontalier du Nord-Est.', answer: 'Ouanaminthe', explanation: 'Ouanaminthe fait face a Dajabon.', points: 10, duration: 0.34 }},
      { type: 'sequence', order: 4, data: { instruction: 'Classez du nord au sud :', items: ['Ouanaminthe', 'Fort-Liberte', 'Trou-du-Nord', 'Valliere'], explanation: '', points: 10, duration: 0.34 }},
    ],
  });
  console.log('  [OK] 5 questions injectees');

  // Configure arena
  const now = new Date();
  await request('PUT', `/modules/${MODULE_ID}`, {
    evaluationType: 'live',
    liveStartTime: new Date(now.getTime() + 60000).toISOString(),
    liveEndTime: new Date(now.getTime() + 600000).toISOString(),
    contestMode: true, globalTimeLimit: 5,
    surveillanceMode: 'strict', proctoring: 'snapshot', snapshotInterval: 15,
    strictSettings: { fullscreen: true, antiCopy: true, blurDetection: true, maxBlurCount: 3 },
    status: 'published',
  });

  // Enable sharing
  const share = await request('POST', `/modules/${MODULE_ID}/share`, { enabled: true });
  SHARE_TOKEN = share.data.shareToken;
  console.log(`  [OK] Arena configuree, token: ${SHARE_TOKEN.substring(0, 12)}...`);
}

// ═══════════════════════════════════════════════════════════════
// CAPTURE ENGINE
// ═══════════════════════════════════════════════════════════════
async function captureArenaMotion() {
  console.log('\n--- Capture Arena Motion ---');

  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Launch browser (visible for the user!)
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--start-maximized', '--window-size=1920,1080'],
  });

  // ── Arena Page ──
  const arenaPage = await browser.newPage();
  await arenaPage.setViewport({ width: 1920, height: 1080 });
  await arenaPage.goto(`${FRONTEND}/live-arena/${SHARE_TOKEN}`, {
    waitUntil: 'networkidle2', timeout: 20000,
  });
  console.log('  [OK] Arena page ouverte');

  // ── Prof Dashboard (2nd tab) ──
  const profPage = await browser.newPage();
  await profPage.setViewport({ width: 1440, height: 900 });
  await profPage.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
  await delay(1500);

  // Login prof
  const tenantValue = await profPage.evaluate((tid) => {
    const select = document.querySelector('select');
    if (!select) return '';
    const opts = [...select.options];
    const m = opts.find(o => o.value === tid || o.text.includes('DDENE'));
    return m ? m.value : opts.length > 1 ? opts[1].value : '';
  }, TENANT_ID);
  if (tenantValue) await profPage.select('select', tenantValue);
  await delay(300);
  await profPage.type('input[type="email"]', 'homologation@ddene.edu.ht');
  await profPage.type('input[type="password"]', 'Homolog2026!');
  await profPage.click('button[type="submit"]');
  await delay(3000);
  await profPage.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/live`, {
    waitUntil: 'networkidle2', timeout: 20000,
  });
  await delay(2000);
  console.log('  [OK] Dashboard Prof ouvert');

  // ── Connect Bots ──
  const BOTS = [
    { name: 'Emmanuelle Jean-Louis', est: 'Lycee National PaP', acc: 1.0 },
    { name: 'Ricardo Pierre', est: 'College Saint-Pierre', acc: 0.8 },
    { name: 'Marie-Claire Baptiste', est: 'Lycee Philippe Guerrier', acc: 0.6 },
    { name: 'Jean-Baptiste Charles', est: 'Ecole Nationale Cayes', acc: 0.5 },
    { name: 'Sophia Estime', est: 'Institution Le Savoir', acc: 1.0 },
    { name: 'Nathalie Dessalines', est: 'Lycee T. Louverture', acc: 0.4 },
    { name: 'Frantz Casimir', est: 'College Marie-Anne', acc: 0.7 },
    { name: 'Claudine Peralte', est: 'Lycee National PaP', acc: 0.8 },
    { name: 'Pierre Germain', est: 'Lycee Philippe Guerrier', acc: 0.5 },
    { name: 'Roseline Toussaint', est: 'Ecole Nationale Cayes', acc: 0.6 },
    { name: 'Patrick Louverture', est: 'College Saint-Pierre', acc: 0.3 },
    { name: 'Guerline Christophe', est: 'Institution Notre-Dame', acc: 0.9 },
  ];

  const botSockets = [];
  for (const bot of BOTS) {
    const s = ioClient(`${BACKEND}/student`, { path: '/socket.io', transports: ['websocket', 'polling'] });
    await new Promise((resolve) => {
      s.on('connect', () => {
        s.emit('join_exam', {
          shareToken: SHARE_TOKEN,
          sessionKey: `arena-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          studentName: bot.name,
          establishment: bot.est,
        });
        resolve();
      });
      setTimeout(resolve, 5000);
    });

    // Auto-answer on questions
    s.on('contest_question', async (data) => {
      const thinkMs = 3000 + Math.random() * 8000;
      await delay(Math.min(thinkMs, (data.duration - 2) * 1000));
      const isCorrect = Math.random() < bot.acc;
      s.emit('answer_submitted', {
        questionIndex: data.questionIndex,
        questionText: data.questionText || '',
        questionType: data.questionType || 'quiz',
        isCorrect,
        pointsEarned: isCorrect ? (data.points || 10) : 0,
        maxPoints: data.points || 10,
        responseTimeMs: Math.round(thinkMs),
        studentAnswer: isCorrect ? 'Fort-Liberte' : 'Cap-Haitien',
      });
    });

    botSockets.push(s);
    await delay(100);
  }
  console.log(`  [OK] ${botSockets.length} bots connectes`);

  // ── Prof Socket — Start Competition ──
  const profSocket = ioClient(`${BACKEND}/prof`, {
    path: '/socket.io', transports: ['websocket', 'polling'],
    auth: { token: TOKEN },
  });
  await new Promise(r => { profSocket.on('connect', r); setTimeout(r, 5000); });
  profSocket.emit('join_room', { moduleId: MODULE_ID });
  await delay(500);

  // Frame counter
  let frameNum = 0;
  const frames = [];

  async function captureFrame(page, label) {
    const fname = `frame-${String(frameNum).padStart(3, '0')}-${label}.png`;
    const fpath = path.join(FRAMES_DIR, fname);
    await page.screenshot({ path: fpath });
    frames.push(fpath);
    frameNum++;
    return fpath;
  }

  // ── PHASE 1 : Lobby (bots connected, waiting) ──
  console.log('\n  --- Phase: LOBBY ---');
  await delay(1000);
  // Switch to arena tab
  await arenaPage.bringToFront();
  await delay(500);
  await captureFrame(arenaPage, 'lobby-1');
  await delay(1000);
  await captureFrame(arenaPage, 'lobby-2');

  // Capture prof dashboard showing connected students
  await profPage.bringToFront();
  await delay(500);
  await captureFrame(profPage, 'prof-lobby');

  // ── START COMPETITION ──
  console.log('  --- Demarrage concours ---');
  profSocket.emit('contest_start', { moduleId: MODULE_ID });

  // ── PHASE 2 : Countdown 3-2-1 ──
  await arenaPage.bringToFront();
  await delay(500);
  await captureFrame(arenaPage, 'countdown-3');
  await delay(1000);
  await captureFrame(arenaPage, 'countdown-2');
  await delay(1000);
  await captureFrame(arenaPage, 'countdown-1');
  await delay(1000);

  // ── PHASE 3 : Questions — capture every 2 seconds ──
  console.log('  --- Phase: QUESTIONS ---');

  let competitionDone = false;
  profSocket.on('contest_state', d => { if (d.status === 'finished') competitionDone = true; });
  profSocket.on('contest_end', () => { competitionDone = true; });

  // Capture Q1 running
  await captureFrame(arenaPage, 'q1-running-1');
  await delay(3000);
  await captureFrame(arenaPage, 'q1-running-2');
  await delay(3000);
  await captureFrame(arenaPage, 'q1-running-3');

  // Wait for Q1 timer to end + reveal
  await delay(8000);
  await captureFrame(arenaPage, 'q1-reveal');
  console.log('  [OK] Q1 Reveal captured');

  // Q2
  await delay(5000);
  await captureFrame(arenaPage, 'q2-running');
  await delay(8000);
  await captureFrame(arenaPage, 'q2-leaderboard');

  // Wait for Q2 reveal
  await delay(10000);
  await captureFrame(arenaPage, 'q2-reveal');
  console.log('  [OK] Q2 Reveal captured');

  // ── THE MOMENTUM : Q3 REVEAL (main target) ──
  console.log('\n  *** THE MOMENTUM : Question 3 Reveal ***');
  await delay(5000);
  await captureFrame(arenaPage, 'q3-running-1');
  await delay(5000);
  await captureFrame(arenaPage, 'q3-running-leaderboard');

  // Prof monitoring during Q3
  await profPage.bringToFront();
  await delay(500);
  await captureFrame(profPage, 'prof-monitoring-q3');
  console.log('  [OK] Prof monitoring captured');

  // Back to arena for Q3 reveal
  await arenaPage.bringToFront();
  await delay(8000);
  // Rapid fire frames during reveal (for animation)
  for (let i = 0; i < 6; i++) {
    await captureFrame(arenaPage, `q3-reveal-${i}`);
    await delay(800);
  }
  console.log('  [OK] Q3 Reveal sequence (6 frames)');

  // ── Q4 + Q5 — keep capturing ──
  console.log('  --- Phase: Q4-Q5 ---');
  for (let q = 4; q <= 5; q++) {
    await delay(5000);
    await captureFrame(arenaPage, `q${q}-running`);
    await delay(15000);
    await captureFrame(arenaPage, `q${q}-reveal`);
  }

  // ── Wait for competition to end ──
  console.log('  --- Attente fin competition ---');
  const waitStart = Date.now();
  while (!competitionDone && Date.now() - waitStart < 60000) {
    await delay(1000);
  }
  await delay(2000);

  // ── PHASE FINALE : Podium ──
  console.log('  --- Phase: PODIUM ---');
  for (let i = 0; i < 4; i++) {
    await captureFrame(arenaPage, `podium-${i}`);
    await delay(1000);
  }
  console.log('  [OK] Podium captured');

  // Final prof dashboard
  await profPage.bringToFront();
  await delay(1000);
  await captureFrame(profPage, 'prof-final');
  console.log('  [OK] Prof final captured');

  // ── Build GIF ──
  console.log('\n--- Assemblage GIF ---');
  await buildGIF(frames);

  // Cleanup
  console.log('\n--- Nettoyage ---');
  botSockets.forEach(s => s.disconnect());
  profSocket.disconnect();
  await delay(2000);
  await browser.close();
  console.log('  [OK] Termine');
}

async function buildGIF(framePaths) {
  if (framePaths.length === 0) {
    console.log('  [SKIP] Aucune frame a assembler');
    return;
  }

  // Read first frame to get dimensions
  const firstBuf = fs.readFileSync(framePaths[0]);
  const firstPng = PNG.sync.read(firstBuf);
  const width = firstPng.width;
  const height = firstPng.height;

  // Scale down for GIF (1920→960 for reasonable file size)
  const scale = width > 1200 ? 0.5 : 1;
  const gw = Math.round(width * scale);
  const gh = Math.round(height * scale);

  const encoder = new GIFEncoder(gw, gh, 'neuquant', true);
  const gifPath = path.join(OUTPUT_DIR, 'demo_arena_performance.gif');
  const writeStream = fs.createWriteStream(gifPath);

  encoder.createReadStream().pipe(writeStream);
  encoder.start();
  encoder.setDelay(600); // 600ms per frame
  encoder.setRepeat(0);  // Loop forever
  encoder.setQuality(15);

  for (let i = 0; i < framePaths.length; i++) {
    try {
      const buf = fs.readFileSync(framePaths[i]);
      const png = PNG.sync.read(buf);

      // Simple nearest-neighbor scale
      const scaled = new Uint8Array(gw * gh * 4);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const sx = Math.min(Math.floor(x / scale), width - 1);
          const sy = Math.min(Math.floor(y / scale), height - 1);
          const si = (sy * width + sx) * 4;
          const di = (y * gw + x) * 4;
          scaled[di] = png.data[si];
          scaled[di + 1] = png.data[si + 1];
          scaled[di + 2] = png.data[si + 2];
          scaled[di + 3] = 255;
        }
      }
      encoder.addFrame(scaled);
      process.stdout.write(`\r  Frame ${i + 1}/${framePaths.length}`);
    } catch (err) {
      console.log(`\n  [WARN] Frame ${i} skip: ${err.message}`);
    }
  }

  encoder.finish();
  console.log('');

  await new Promise(r => writeStream.on('finish', r));
  const size = fs.statSync(gifPath).size;
  console.log(`  [OK] GIF genere: ${gifPath} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`  [OK] ${framePaths.length} frames, ${gw}x${gh}px`);

  // Also save key frames as standalone PNGs
  const keyFrames = framePaths.filter(f =>
    f.includes('reveal') || f.includes('podium') || f.includes('prof-') || f.includes('lobby-1') || f.includes('countdown-3')
  );
  for (const kf of keyFrames) {
    const dest = path.join(OUTPUT_DIR, path.basename(kf));
    fs.copyFileSync(kf, dest);
  }
  console.log(`  [OK] ${keyFrames.length} frames cles copiees dans ${OUTPUT_DIR}/`);
}

// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Arena Motion Demo — Capture Animee Live Arena TV           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    await setup();
    await captureArenaMotion();
  } catch (err) {
    console.error('\n[ERREUR FATALE]', err.message);
    console.error(err.stack);
  }

  process.exit(0);
}

main();
