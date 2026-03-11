import { test, expect } from '@playwright/test';

test.describe('Auth Middleware Redirects', () => {
  // Scenario: Unauthenticated users
  test.describe('Unauthenticated User', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should redirect from /dashboard to /login?next=/dashboard', async ({ page }) => {
      // Intercept user request to return null session
      await page.route(/\/auth\/v1\/user/, async (route) => {
        await route.fulfill({ status: 401, json: { error: 'unauthorized' } });
      });

      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
    });

    test('should redirect from /onboarding to /login?next=/onboarding', async ({ page }) => {
      await page.route(/\/auth\/v1\/user/, async (route) => {
        await route.fulfill({ status: 401, json: { error: 'unauthorized' } });
      });

      await page.goto('/onboarding');
      await expect(page).toHaveURL(/\/login\?next=%2Fonboarding/);
    });

    test('should allow access to public home page', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL('/');
      // Verify some landing page content
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  // Scenario: Authenticated users
  test.describe('Authenticated User', () => {
    // Default storage state from playwright.config.ts is used here

    test('should redirect from /login to /dashboard', async ({ page }) => {
      await page.goto('/login');
      // Middleware should kick in and redirect to dashboard or onboarding (if profile incomplete)
      await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
    });

    test('should redirect from /signup to /dashboard', async ({ page }) => {
      await page.goto('/signup');
      await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
    });

    test('should redirect from /forgot-password to /dashboard', async ({ page }) => {
      await page.goto('/forgot-password');
      await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
    });

    test('should redirect from /reset-password to /dashboard', async ({ page }) => {
      await page.goto('/reset-password');
      await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
    });
  });
});
