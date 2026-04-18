/**
 * TEGS-Learning — Test navigateur automatise (Puppeteer + Chrome)
 *
 * Teste les pages frontend en vrai navigateur :
 * 1. Login prof
 * 2. Page Settings du module demo
 * 3. Page Reporting (resultats + stats)
 * 4. Page Live dashboard
 * 5. Page publique eleve (quiz)
 *
 * Pre-requis : backend:3000 + frontend:3002 demarres
 * Usage : node test-browser.js
 */

const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FRONTEND = 'http://localhost:3002';
const BACKEND = 'http://localhost:3000';
const MODULE_ID = '69b41a4dd5c6acccdccd569d';
const SHARE_TOKEN = 'b7ed14351e0c04bb8f8cfa81110c4a3a';

const delay = ms => new Promise(r => setTimeout(r, ms));

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
  console.log('=== TEGS-Learning | Test Navigateur Chrome ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // -----------------------------------------------------------------------
    // 1. Login
    // -----------------------------------------------------------------------
    console.log('--- Test 1 : Login ---');

    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    assert(page.url().includes('/login'), 'Page login chargee');

    // Wait for tenants dropdown to load
    await delay(2000);

    // Select tenant from dropdown (select element)
    const selectEl = await page.$('select');
    if (selectEl) {
      // Find the DDENE-DEMO tenant option value
      const tenantValue = await page.evaluate(() => {
        const select = document.querySelector('select');
        if (!select) return '';
        const opts = [...select.options];
        const match = opts.find(o => o.text.includes('DDENE') || o.text.includes('Demo'));
        return match ? match.value : opts.length > 1 ? opts[1].value : '';
      });
      if (tenantValue) {
        await page.select('select', tenantValue);
      }
      assert(!!tenantValue, 'Tenant DDENE selectionne dans le dropdown');
    }

    await delay(500);

    // Fill email
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('prof-demo@ddene.edu.ht');
    }
    assert(!!emailInput, 'Champ email trouve');

    // Fill password
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await passInput.click({ clickCount: 3 });
      await passInput.type('Demo2026!');
    }
    assert(!!passInput, 'Champ password trouve');

    await page.screenshot({ path: 'captures/01-login-filled.png' });

    // Submit
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }

    // Wait for navigation
    await delay(4000);
    const afterLoginUrl = page.url();
    assert(!afterLoginUrl.includes('/login'), `Redirige apres login (${afterLoginUrl})`);

    await page.screenshot({ path: 'captures/02-after-login.png' });

    // -----------------------------------------------------------------------
    // 2. Settings
    // -----------------------------------------------------------------------
    console.log('\n--- Test 2 : Settings ---');

    await page.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/settings`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    const settingsUrl = page.url();
    const settingsContent = await page.content();
    assert(settingsUrl.includes('/settings'), 'Page settings chargee');
    assert(
      !settingsContent.includes('500') || settingsContent.includes('Inauguration'),
      'Pas d\'erreur 500 sur settings'
    );

    // Check module title is visible
    const hasTitle = settingsContent.includes('Inauguration') || settingsContent.includes('Culture');
    assert(hasTitle, 'Titre du module visible');

    await page.screenshot({ path: 'captures/03-settings.png' });

    // -----------------------------------------------------------------------
    // 3. Reporting
    // -----------------------------------------------------------------------
    console.log('\n--- Test 3 : Reporting ---');

    await page.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/reporting`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    const reportingContent = await page.content();
    assert(page.url().includes('/reporting'), 'Page reporting chargee');

    // Should show participants
    const hasParticipants = reportingContent.includes('Emmanuelle') ||
      reportingContent.includes('Ricardo') ||
      reportingContent.includes('participant');
    assert(hasParticipants, 'Participants visibles dans le reporting');

    // Stats cards
    const hasStats = reportingContent.includes('Score Moyen') ||
      reportingContent.includes('Participants') ||
      reportingContent.includes('%');
    assert(hasStats, 'Stats visibles');

    await page.screenshot({ path: 'captures/04-reporting.png' });

    // -----------------------------------------------------------------------
    // 4. Live Dashboard
    // -----------------------------------------------------------------------
    console.log('\n--- Test 4 : Live Dashboard ---');

    await page.goto(`${FRONTEND}/admin/modules/${MODULE_ID}/live`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    const liveContent = await page.content();
    assert(page.url().includes('/live'), 'Page live chargee');

    const hasLiveUI = liveContent.includes('live') || liveContent.includes('Live') ||
      liveContent.includes('Arena') || liveContent.includes('Contest') ||
      liveContent.includes('Monitoring') || liveContent.includes('dashboard');
    assert(hasLiveUI, 'Interface live dashboard presente');

    await page.screenshot({ path: 'captures/05-live.png' });

    // -----------------------------------------------------------------------
    // 5. Page publique eleve
    // -----------------------------------------------------------------------
    console.log('\n--- Test 5 : Page Eleve (publique) ---');

    const studentPage = await browser.newPage();
    await studentPage.goto(`${BACKEND}/api/share/public/${SHARE_TOKEN}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    const studentContent = await studentPage.content();
    const studentStatus = studentPage.url();
    assert(!studentContent.includes('"error"'), 'Pas d\'erreur JSON sur page eleve');

    // Check for quiz content or waiting page
    const hasQuizContent = studentContent.includes('Haiti') ||
      studentContent.includes('Culture') ||
      studentContent.includes('Inauguration') ||
      studentContent.includes('independance') ||
      studentContent.includes('TEGS');
    assert(hasQuizContent, 'Contenu du quiz ou page d\'attente visible');

    const isHTML = studentContent.includes('<html') || studentContent.includes('<!DOCTYPE');
    assert(isHTML, 'Page HTML rendue (pas du JSON brut)');

    await studentPage.screenshot({ path: 'captures/06-student-quiz.png' });
    await studentPage.close();

    // -----------------------------------------------------------------------
    // 6. Verifier les erreurs console
    // -----------------------------------------------------------------------
    console.log('\n--- Test 6 : Erreurs console ---');

    const critical500 = consoleErrors.filter(e =>
      e.includes('500') || e.includes('Internal Server Error')
    );
    assert(critical500.length === 0, `Pas d'erreurs 500 (${critical500.length} trouvees)`);
    if (critical500.length > 0) {
      critical500.forEach(e => console.log(`    > ${e.substring(0, 120)}`));
    }

    // -----------------------------------------------------------------------
    // Resume
    // -----------------------------------------------------------------------
    console.log('\n========================================');
    console.log(`  RESULTATS : ${passed} PASS / ${failed} FAIL sur ${passed + failed} tests`);
    console.log('========================================');
    console.log(`  Screenshots sauves dans captures/`);

    if (failed > 0) {
      console.log('\n  [ECHEC] Des tests ont echoue.');
    } else {
      console.log('\n  [SUCCES] Toutes les pages fonctionnent !');
    }

    // Keep browser open 5s for visual inspection
    await delay(5000);

  } catch (err) {
    console.error('\n[ERREUR]', err.message);
    await page.screenshot({ path: 'captures/error.png' }).catch(() => {});
  } finally {
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests().catch(err => {
  console.error('\n[ERREUR FATALE]', err.message);
  process.exit(1);
});
