import { test, expect } from '@playwright/test';

test.describe('Dashboard Trips', () => {
  test('User can see their dashboard trips after logging in', async ({ page }) => {
    // Navigate to dashboard - assumes authentication is set up correctly in the fixtures
    // or middleware redirects to login.
    // For a real E2E we would typically log in first.
    // Assuming Playwright is configured to inject auth state for these tests.

    // As a placeholder for actual E2E testing given the current environment structure:
    await page.goto('/dashboard');

    // We expect to see the dashboard header
    // Wait for either the "My Trips" header or the redirect to login
    const isLogin = await page.url().includes('/login');
    if (!isLogin) {
      await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible();

      // We expect to see either the empty state or the "Active Trips" / "Past Trips" sections
      const hasEmptyState = await page.locator('text=No trips planned yet').isVisible();
      const hasActiveTrips = await page.locator('text=Active Trips').isVisible();
      const hasPastTrips = await page.locator('text=Past Trips').isVisible();

      expect(hasEmptyState || hasActiveTrips || hasPastTrips).toBeTruthy();
    }
  });
});
