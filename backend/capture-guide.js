/**
 * TEGS-Learning — Captures d'ecran pour Guide Utilisateur SIGEPRO
 *
 * Genere une serie complete de screenshots couvrant toutes les fonctionnalites.
 * Les fichiers sont numerotes et nommes pour integration directe dans le guide.
 *
 * Usage : node capture-guide.js
 */

const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FRONTEND = 'http://localhost:3002';
const BACKEND = 'http://localhost:3000';
const MODULE_ID = '69b41a4dd5c6acccdccd569d';
const SHARE_TOKEN = 'b7ed14351e0c04bb8f8cfa81110c4a3a';
const CAPTURES = 'captures/guide';

const delay = ms => new Promise(r => setTimeout(r, ms));

async function capture(page, name) {
  const path = `${CAPTURES}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  [OK] ${name}`);
}

async function captureFull(page, name) {
  const path = `${CAPTURES}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`  [OK] ${name} (full)`);
}

async function run() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TEGS-Learning — Captures Guide Utilisateur                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const fs = require('fs');
  fs.mkdirSync(CAPTURES, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  // =======================================================================
  // 01 — PAGE DE CONNEXION
  // =======================================================================
  console.log('--- 01. Connexion ---');

  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await capture(page, '01-login-page-vide');

  // Select tenant
  const tenantValue = await page.evaluate(() => {
    const select = document.querySelector('select');
    if (!select) return '';
    const opts = [...select.options];
    const match = opts.find(o => o.text.includes('DDENE') || o.text.includes('Demo'));
    return match ? match.value : opts.length > 1 ? opts[1].value : '';
  });
  if (tenantValue) await page.select('select', tenantValue);
  await delay(500);

  await page.$eval('input[type="email"]', el => { el.value = ''; });
  await page.type('input[type="email"]', 'prof-demo@ddene.edu.ht');
  await page.$eval('input[type="password"]', el => { el.value = ''; });
  await page.type('input[type="password"]', 'Demo2026!');
  await capture(page, '02-login-formulaire-rempli');

  // Login
  await page.click('button[type="submit"]');
  await delay(4000);
  await capture(page, '03-dashboard-modules');

  // =======================================================================
  // 02 — LISTE DES MODULES
  // =======================================================================
  console.log('--- 02. Liste des modules ---');
  await page.goto(`${FRONTEND}/admin/modules`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await capture(page, '04-mes-modules');

  // =======================================================================
  // 03 — SETTINGS : Chaque onglet
  // =======================================================================
  console.log('--- 03. Settings (8 onglets) ---');

  await page.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/settings`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await capture(page, '05-settings-proprietes');

  // Click each tab
  const tabs = ['Theme', 'Mode evaluation', 'Chronometre', 'Partager', 'Surveillance', 'Exporter', 'Supprimer'];
  for (let i = 0; i < tabs.length; i++) {
    const tabName = tabs[i];
    const clicked = await page.evaluate((name) => {
      const btns = [...document.querySelectorAll('button, a, [role="tab"]')];
      const tab = btns.find(b => b.textContent.trim().toLowerCase().includes(name.toLowerCase()));
      if (tab) { tab.click(); return true; }
      return false;
    }, tabName);

    if (clicked) {
      await delay(1500);
      const slug = tabName.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-');
      await capture(page, `06-settings-${String(i + 2).padStart(1, '0')}-${slug}`);
    }
  }

  // =======================================================================
  // 04 — STUDIO (Editeur de contenu)
  // =======================================================================
  console.log('--- 04. Studio (editeur) ---');

  // Get first screen ID
  const screenId = await page.evaluate(async () => {
    try {
      const r = await fetch(`http://127.0.0.1:3000/api/modules/${arguments[0]}`, {
        headers: { 'Authorization': `Bearer ${document.cookie.match(/__session=([^;]*)/)?.[1] ? JSON.parse(decodeURIComponent(document.cookie.match(/__session=([^;]*)/)[1])).token : ''}` }
      });
      const d = await r.json();
      return d.module?.sections?.[0]?.screens?.[0]?._id || '';
    } catch { return ''; }
  }, MODULE_ID);

  if (screenId) {
    await page.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/screens/${screenId}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(3000);
    await capture(page, '10-studio-editeur');
  } else {
    // Direct URL with first screen
    await page.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/settings`, { waitUntil: 'networkidle2', timeout: 20000 });
    await delay(1000);
    console.log('  [SKIP] Studio - screenId non trouve');
  }

  // =======================================================================
  // 05 — REPORTING
  // =======================================================================
  console.log('--- 05. Reporting ---');

  await page.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/reporting`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await capture(page, '11-reporting-vue-globale');
  await captureFull(page, '12-reporting-complet');

  // =======================================================================
  // 06 — LIVE CLASSROOM
  // =======================================================================
  console.log('--- 06. Live Classroom ---');

  await page.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/live`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await capture(page, '13-live-monitoring');

  // Click Proctoring tab if exists
  const proctoringClicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, a, [role="tab"]')];
    const tab = btns.find(b => /proctoring|surveillance/i.test(b.textContent));
    if (tab) { tab.click(); return true; }
    return false;
  });
  if (proctoringClicked) {
    await delay(1500);
    await capture(page, '14-live-proctoring');
  }

  // =======================================================================
  // 07 — ANALYTICS
  // =======================================================================
  console.log('--- 07. Analytics ---');

  await page.goto(`${FRONTEND}/admin/analytics`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await capture(page, '15-analytics-dashboard');

  // =======================================================================
  // 08 — FACTURATION / BILLING
  // =======================================================================
  console.log('--- 08. Facturation ---');

  await page.goto(`${FRONTEND}/admin/billing`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await capture(page, '16-facturation-plans');

  // =======================================================================
  // 09 — MEDIATHEQUE
  // =======================================================================
  console.log('--- 09. Mediatheque ---');

  await page.goto(`${FRONTEND}/admin/media`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await capture(page, '17-mediatheque');

  // =======================================================================
  // 10 — PAGE ELEVE (publique)
  // =======================================================================
  console.log('--- 10. Page Eleve ---');

  const studentPage = await browser.newPage();
  await studentPage.setViewport({ width: 1440, height: 900 });

  await studentPage.goto(`${BACKEND}/api/share/public/${SHARE_TOKEN}`, {
    waitUntil: 'networkidle2', timeout: 30000,
  });
  await delay(3000);

  const path20 = `${CAPTURES}/20-eleve-page-publique.png`;
  await studentPage.screenshot({ path: path20 });
  console.log('  [OK] 20-eleve-page-publique');

  // Try personalized mode (disable live temporarily)
  // We'll just capture what we get — could be waiting page or quiz
  await delay(1000);
  const path21 = `${CAPTURES}/21-eleve-contenu.png`;
  await studentPage.screenshot({ path: path21, fullPage: true });
  console.log('  [OK] 21-eleve-contenu (full)');

  await studentPage.close();

  // =======================================================================
  // 11 — PAGE ELEVE en mode mobile
  // =======================================================================
  console.log('--- 11. Vue mobile ---');

  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true });

  await mobilePage.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  const path30 = `${CAPTURES}/30-mobile-login.png`;
  await mobilePage.screenshot({ path: path30 });
  console.log('  [OK] 30-mobile-login');

  await mobilePage.goto(`${BACKEND}/api/share/public/${SHARE_TOKEN}`, {
    waitUntil: 'networkidle2', timeout: 30000,
  });
  await delay(2000);
  const path31 = `${CAPTURES}/31-mobile-eleve-quiz.png`;
  await mobilePage.screenshot({ path: path31 });
  console.log('  [OK] 31-mobile-eleve-quiz');

  await mobilePage.close();

  // =======================================================================
  // Resume
  // =======================================================================
  const files = fs.readdirSync(CAPTURES).filter(f => f.endsWith('.png'));

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  ${files.length} captures generees dans ${CAPTURES}/`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  files.forEach(f => console.log(`║  ${f}`));
  console.log('╚══════════════════════════════════════════════════════════════╝');

  await browser.close();
  process.exit(0);
}

run().catch(err => {
  console.error('[ERREUR FATALE]', err.message);
  process.exit(1);
});
