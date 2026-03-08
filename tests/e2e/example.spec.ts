import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // We just expect the page to load and not crash.
  await expect(page).toHaveTitle(/PackRight/i);
});
