const { chromium } = require('playwright');

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3456');
  await page.waitForTimeout(2000);
  
  // Screenshot 1: Base Grid View
  await page.screenshot({ path: 'screenshots/01-base-grid.png' });
  console.log('✓ Screenshot 1: Base Grid View');
  
  // Click on first "View Topology" link
  await page.click('text=View Topology');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/03-team-topology.png' });
  console.log('✓ Screenshot 2: Team Topology View');
  
  // Go back to grid
  await page.click('text=Back');
  await page.waitForTimeout(1000);
  
  // Click Teams tab for Team Builder
  await page.click('text=Teams');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/04-team-builder.png' });
  console.log('✓ Screenshot 3: Team Builder View');
  
  await browser.close();
  console.log('\n✅ Screenshots updated!');
}

captureScreenshots().catch(console.error);
