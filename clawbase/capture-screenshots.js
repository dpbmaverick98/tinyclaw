const { chromium } = require('playwright');
const path = require('path');

async function captureScreenshots() {
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log(error.stack);
  });
  
  // Navigate to app (server already running)
  await page.goto('http://localhost:3456');
  await page.waitForTimeout(3000);
  
  // Screenshot 1: Base view (grid)
  await page.screenshot({ path: 'screenshots/01-base-grid.png', fullPage: false });
  console.log('✓ Screenshot 1: Base grid view');
  
  // Close browser
  await browser.close();
  
  console.log('\nScreenshots saved to screenshots/');
}

captureScreenshots().catch(console.error);
