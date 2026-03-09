const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3456';

async function captureScreenshots() {
  const browser = await chromium.launch();
  
  // Light mode screenshots
  console.log('=== LIGHT MODE ===');
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const lightPage = await lightContext.newPage();
  
  await lightPage.goto(BASE_URL);
  await lightPage.waitForSelector('text=Claude Architect', { timeout: 10000 });
  await lightPage.waitForTimeout(1000);
  
  // 1. Grid View
  await lightPage.screenshot({ path: 'screenshots/light-01-grid.png' });
  console.log('✓ light-01-grid.png');
  
  // 2. Agent Detail
  await lightPage.click('text=Claude Architect');
  await lightPage.waitForTimeout(1500);
  await lightPage.screenshot({ path: 'screenshots/light-02-agent.png' });
  console.log('✓ light-02-agent.png');
  
  // 3. Create Agent Modal
  await lightPage.click('text=New Agent');
  await lightPage.waitForTimeout(1000);
  await lightPage.screenshot({ path: 'screenshots/light-03-create.png' });
  console.log('✓ light-03-create.png');
  
  // 4. Team Builder - close modal then click Teams
  await lightPage.click('button:has-text("Cancel")');
  await lightPage.waitForTimeout(500);
  await lightPage.click('button:has-text("Teams")');
  await lightPage.waitForTimeout(1500);
  await lightPage.screenshot({ path: 'screenshots/light-04-teams.png' });
  console.log('✓ light-04-teams.png');
  
  await lightContext.close();
  
  // Dark mode screenshots
  console.log('\n=== DARK MODE ===');
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const darkPage = await darkContext.newPage();
  
  await darkPage.goto(BASE_URL);
  await darkPage.waitForSelector('text=Claude Architect', { timeout: 10000 });
  await darkPage.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await darkPage.waitForTimeout(1000);
  
  // 1. Grid View
  await darkPage.screenshot({ path: 'screenshots/dark-01-grid.png' });
  console.log('✓ dark-01-grid.png');
  
  // 2. Agent Detail
  await darkPage.click('text=Claude Architect');
  await darkPage.waitForTimeout(1500);
  await darkPage.screenshot({ path: 'screenshots/dark-02-agent.png' });
  console.log('✓ dark-02-agent.png');
  
  // 3. Create Agent Modal
  await darkPage.click('text=New Agent');
  await darkPage.waitForTimeout(1000);
  await darkPage.screenshot({ path: 'screenshots/dark-03-create.png' });
  console.log('✓ dark-03-create.png');
  
  // 4. Team Builder
  await darkPage.click('button:has-text("Cancel")');
  await darkPage.waitForTimeout(500);
  await darkPage.click('button:has-text("Teams")');
  await darkPage.waitForTimeout(1500);
  await darkPage.screenshot({ path: 'screenshots/dark-04-teams.png' });
  console.log('✓ dark-04-teams.png');
  
  await darkContext.close();
  await browser.close();
  
  console.log('\n✅ All screenshots captured!');
}

captureScreenshots().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
