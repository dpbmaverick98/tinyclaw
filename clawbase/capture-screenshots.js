const { chromium } = require('playwright');
const path = require('path');

async function captureScreenshots() {
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // Navigate to app
  await page.goto('http://localhost:3456');
  await page.waitForTimeout(2000);
  
  // Screenshot 1: Base Grid View
  await page.screenshot({ path: 'screenshots/01-base-grid.png' });
  console.log('✓ Screenshot 1: Base Grid View');
  
  // Click on an agent card to see Agent Detail
  await page.click('text=Claude Architect');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/02-agent-detail.png' });
  console.log('✓ Screenshot 2: Agent Detail View');
  
  // Go back and click on Team Topology
  await page.click('text=Back');
  await page.waitForTimeout(500);
  
  // Click View Topology for Backend Squad
  const viewTopologyButtons = await page.locator('text=View Topology').all();
  if (viewTopologyButtons.length > 0) {
    await viewTopologyButtons[0].click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/03-team-topology.png' });
    console.log('✓ Screenshot 3: Team Topology View');
  }
  
  // Go back and click Teams tab for Team Builder
  await page.click('text=Back');
  await page.waitForTimeout(500);
  await page.click('text=Teams');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/04-team-builder.png' });
  console.log('✓ Screenshot 4: Team Builder View');
  
  // Go back to Grid and open Create Agent modal
  await page.click('text=Grid');
  await page.waitForTimeout(500);
  await page.click('text=New Agent');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/05-create-agent.png' });
  console.log('✓ Screenshot 5: Create Agent Modal');
  
  // Close modal and open Command Palette
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/06-command-palette.png' });
  console.log('✓ Screenshot 6: Command Palette');
  
  // Close browser
  await browser.close();
  
  console.log('\n✅ All screenshots saved to screenshots/');
}

captureScreenshots().catch(console.error);
