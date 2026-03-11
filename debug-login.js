const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:3001/login');
    console.log('Filling form...');
    await page.fill('input[name="email"]', 'e2e-chromium@packright.test');
    await page.fill('input[name="password"]', 'Password123!');
    console.log('Clicking submit...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting 10s for navigation...');
    await page.waitForTimeout(10000);
    
    const url = page.url();
    console.log('Current URL is now:', url);
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('Screenshot saved to test-screenshot.png');
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
