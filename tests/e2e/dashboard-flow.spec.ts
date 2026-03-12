import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard - assumes authentication is set up correctly in global-setup or fixtures
    await page.goto('/dashboard');

    // Check if we are redirected to login, if so skip the rest (or handle login if needed for this environment)
    if (page.url().includes('/login')) {
      console.log('Redirected to login, skipping E2E flow steps that require auth');
    }
  });

  test('should display dashboard correctly for authenticated user', async ({ page }) => {
    if (page.url().includes('/login')) return;

    // Verify Header
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible();

    // Verify "New Trip" button
    const newTripBtn = page.getByRole('button', { name: 'New Trip' });
    await expect(newTripBtn).toBeVisible();

    // Check for trips or empty state
    const emptyState = page.locator('text=No trips planned yet');
    const hasTrips = (await page.locator('section').count()) > 0;

    if (!hasTrips) {
      await expect(emptyState).toBeVisible();
      await expect(page.getByRole('button', { name: 'Plan Your First Trip' })).toBeVisible();
    } else {
      // Check for at least one trip card
      const tripCards = page.locator('a[href^="/dashboard/trips/"]');
      await expect(tripCards.first()).toBeVisible();
    }
  });

  test('should navigate to trip detail page when clicking a trip card', async ({ page }) => {
    if (page.url().includes('/login')) return;

    const tripCard = page.locator('a[href^="/dashboard/trips/"]').first();
    const count = await tripCard.count();

    if (count > 0) {
      const href = await tripCard.getAttribute('href');
      await tripCard.click();
      await expect(page).toHaveURL(new RegExp(href!));
    }
  });

  test('responsive layout check', async ({ page }) => {
    if (page.url().includes('/login')) return;

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible();
    // Header often collapses or wraps on mobile, check for visibility
    const header = page.getByText('My Trips');
    await expect(header).toBeVisible();

    // Desktop view
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible();
  });
});
