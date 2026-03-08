const { chromium } = require('playwright');

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Light mode
  console.log('Capturing screenshots...');
  await page.goto('http://localhost:3456');
  
  // Wait for agents to load
  await page.waitForSelector('text=Claude Architect', { timeout: 10000 });
  await page.waitForTimeout(1000);
  
  // 1. Create Agent Modal
  await page.click('text=New Agent');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/light-03-create-agent.png' });
  console.log('✓ light-03-create-agent.png');
  
  // Close modal by clicking the X button
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(500);
  
  // 2. Team Builder
  await page.waitForTimeout(500);
  await page.click('text=Teams');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/light-04-team-builder.png' });
  console.log('✓ light-04-team-builder.png');
  
  await browser.close();
  console.log('\n✅ Screenshots captured!');
}

captureScreenshots().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
