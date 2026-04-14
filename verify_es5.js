const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForSelector('#initial-loader', { state: 'hidden', timeout: 10000 });
    console.log('SUCCESS: App loaded and mounted.');
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
