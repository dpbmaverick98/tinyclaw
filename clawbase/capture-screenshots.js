const { chromium } = require('playwright');

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Light mode (default)
  console.log('Capturing Light Mode...');
  await page.goto('http://localhost:3456');
  
  // Wait for agents to load (look for Claude Architect text)
  console.log('Waiting for agents to load...');
  await page.waitForSelector('text=Claude Architect', { timeout: 10000 });
  await page.waitForTimeout(1000);
  
  // 1. Grid View
  await page.screenshot({ path: 'screenshots/light-01-grid.png' });
  console.log('✓ light-01-grid.png');
  
  // 2. Agent Detail
  await page.click('text=Claude Architect');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/light-02-agent.png' });
  console.log('✓ light-02-agent.png');
  
  // 3. Create Agent Modal
  await page.click('text=Back');
  await page.waitForTimeout(800);
  await page.click('text=New Agent');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/light-03-create.png' });
  console.log('✓ light-03-create.png');
  
  await browser.close();
  console.log('\n✅ Screenshots captured!');
}

captureScreenshots().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
