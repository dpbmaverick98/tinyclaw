const { chromium } = require('playwright');

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Light mode (default)
  console.log('Capturing Light Mode...');
  await page.goto('http://localhost:3456');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'screenshots/light-01-grid.png' });
  console.log('✓ light-01-grid.png');
  
  // Click agent
  await page.click('text=Claude Architect');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/light-02-agent.png' });
  console.log('✓ light-02-agent.png');
  
  // Create agent modal
  await page.click('text=Back');
  await page.waitForTimeout(800);
  await page.click('text=New Agent');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/light-03-create.png' });
  console.log('✓ light-03-create.png');
  
  await browser.close();
  console.log('\n✅ Done!');
}

captureScreenshots().catch(console.error);
