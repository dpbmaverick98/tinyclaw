const { chromium } = require('playwright');

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3456');
  await page.waitForTimeout(2000);
  
  // Dark mode screenshots
  await page.screenshot({ path: 'screenshots/dark-01-grid.png' });
  console.log('✓ Dark: Grid View');
  
  // Click on agent
  await page.click('text=Claude Architect');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/dark-02-agent.png' });
  console.log('✓ Dark: Agent Detail');
  
  // Go back
  await page.click('text=Back');
  await page.waitForTimeout(500);
  
  // Switch to light mode
  await page.click('[title="Switch to light mode"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/light-01-grid.png' });
  console.log('✓ Light: Grid View');
  
  // Click on agent in light mode
  await page.click('text=Claude Architect');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/light-02-agent.png' });
  console.log('✓ Light: Agent Detail');
  
  // Open create agent modal in light mode
  await page.click('text=Back');
  await page.waitForTimeout(500);
  await page.click('text=New Agent');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/light-03-create.png' });
  console.log('✓ Light: Create Agent');
  
  await browser.close();
  console.log('\n✅ All screenshots captured!');
}

captureScreenshots().catch(console.error);
