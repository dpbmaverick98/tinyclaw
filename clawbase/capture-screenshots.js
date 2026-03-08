const { chromium } = require('playwright');

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // ========== LIGHT MODE (default) ==========
  console.log('Capturing Light Mode screenshots...');
  await page.goto('http://localhost:3456');
  await page.waitForTimeout(2000);
  
  // 1. Grid View
  await page.screenshot({ path: 'screenshots/light-01-grid.png' });
  console.log('✓ light-01-grid.png');
  
  // 2. Agent Detail
  await page.click('text=Claude Architect');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/light-02-agent-detail.png' });
  console.log('✓ light-02-agent-detail.png');
  
  // 3. Create Agent Modal
  await page.click('text=Back');
  await page.waitForTimeout(500);
  await page.click('text=New Agent');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/light-03-create-agent.png' });
  console.log('✓ light-03-create-agent.png');
  await page.keyboard.press('Escape');
  
  // 4. Command Palette
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/light-04-command-palette.png' });
  console.log('✓ light-04-command-palette.png');
  await page.keyboard.press('Escape');
  
  // 5. Team Topology
  await page.waitForTimeout(500);
  await page.click('text=View Topology');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/light-05-team-topology.png' });
  console.log('✓ light-05-team-topology.png');
  
  // 6. Team Builder
  await page.click('text=Back');
  await page.waitForTimeout(500);
  await page.click('text=Teams');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/light-06-team-builder.png' });
  console.log('✓ light-06-team-builder.png');
  
  // ========== DARK MODE ==========
  console.log('\nCapturing Dark Mode screenshots...');
  await page.click('text=Grid');
  await page.waitForTimeout(500);
  await page.click('[title="Switch to dark mode"]');
  await page.waitForTimeout(1000);
  
  // 1. Grid View
  await page.screenshot({ path: 'screenshots/dark-01-grid.png' });
  console.log('✓ dark-01-grid.png');
  
  // 2. Agent Detail
  await page.click('text=Claude Architect');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/dark-02-agent-detail.png' });
  console.log('✓ dark-02-agent-detail.png');
  
  // 3. Create Agent Modal
  await page.click('text=Back');
  await page.waitForTimeout(500);
  await page.click('text=New Agent');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/dark-03-create-agent.png' });
  console.log('✓ dark-03-create-agent.png');
  await page.keyboard.press('Escape');
  
  // 4. Command Palette
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/dark-04-command-palette.png' });
  console.log('✓ dark-04-command-palette.png');
  await page.keyboard.press('Escape');
  
  await browser.close();
  
  console.log('\n✅ All 10 screenshots captured!');
}

captureScreenshots().catch(console.error);
