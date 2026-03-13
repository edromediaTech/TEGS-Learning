/**
 * Capture Studio + ecrans supplementaires (non-headless pour cookie access)
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FRONTEND = 'http://localhost:3002';
const MODULE_ID = '69b41a4dd5c6acccdccd569d';
const CAPTURES = 'captures/guide';
const SCREENS = [
  { id: '69b41a4dd5c6acccdccd56a2', title: 'Histoire' },
  { id: '69b41a4dd5c6acccdccd56a3', title: 'Geographie' },
  { id: '69b41a4dd5c6acccdccd56a4', title: 'Litterature' },
  { id: '69b41a4dd5c6acccdccd56a5', title: 'Patrimoine' },
  { id: '69b41a4dd5c6acccdccd56a6', title: 'Musique' },
];

const delay = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('=== Capture Studio (non-headless) ===\n');
  fs.mkdirSync(CAPTURES, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  // Login
  console.log('Login...');
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  const tenantValue = await page.evaluate(() => {
    const select = document.querySelector('select');
    if (!select) return '';
    const opts = [...select.options];
    const match = opts.find(o => o.text.includes('DDENE') || o.text.includes('Demo'));
    return match ? match.value : opts.length > 1 ? opts[1].value : '';
  });
  if (tenantValue) await page.select('select', tenantValue);
  await delay(500);

  await page.type('input[type="email"]', 'prof-demo@ddene.edu.ht');
  await page.type('input[type="password"]', 'Demo2026!');
  await page.click('button[type="submit"]');
  await delay(4000);
  console.log('  OK login');

  // Capture each Studio screen
  for (let i = 0; i < SCREENS.length; i++) {
    const s = SCREENS[i];
    console.log(`Studio: ${s.title}...`);
    await page.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/screens/${s.id}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(3000);

    const name = `10-studio-${i + 1}-${s.title.toLowerCase().replace(/[^a-z]/g, '')}`;
    await page.screenshot({ path: `${CAPTURES}/${name}.png` });
    console.log(`  [OK] ${name}`);

    // Full page for first screen
    if (i === 0) {
      await page.screenshot({ path: `${CAPTURES}/10-studio-0-complet.png`, fullPage: true });
      console.log(`  [OK] 10-studio-0-complet (full)`);
    }
  }

  // Also capture the module list with "Ouvrir le Studio" visible
  await page.goto(`${FRONTEND}/admin/modules`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await page.screenshot({ path: `${CAPTURES}/04-modules-avec-studio.png` });
  console.log('  [OK] 04-modules-avec-studio');

  const files = fs.readdirSync(CAPTURES).filter(f => f.endsWith('.png'));
  console.log(`\n${files.length} captures totales dans ${CAPTURES}/`);

  await delay(3000);
  await browser.close();
  process.exit(0);
}

run().catch(err => {
  console.error('[ERREUR]', err.message);
  process.exit(1);
});
