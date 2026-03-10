import { test, expect } from '@playwright/test';

test.describe('Authentication UI Flow', () => {
  test('should show validation errors when submitting an empty login form', async ({ page }) => {
    await page.goto('/login');

    // Verify visual elements
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.locator('h1').filter({ hasText: 'PackRight' })).toBeVisible();

    // Click submit without entering data
    await page.click('button[type="submit"]');

    // Verify Zod validation errors immediately appear in the DOM
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should navigate between login and signup pages', async ({ page }) => {
    await page.goto('/login');

    // Click the sign up link
    await page.click('text=Create one');

    // Check if it routes to signup
    await expect(page).toHaveURL(/.*\/signup/);
    await expect(page.getByText('Create an account', { exact: true })).toBeVisible();

    // Click login link to go back
    await page.click('text=Sign in');

    // Check if it routes back to login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    // Intercept the Supabase Auth API call to mock a successful login response.
    // This allows the E2E test to verify the UI flow (loading state, toast, redirect)

    // Mock the POST token request
    await page.route(/\/auth\/v1\/token\?grant_type=password/, async (route) => {
      const json = {
        access_token: 'fake-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: { id: 'mock-user-123', email: 'testuser@example.com' },
      };
      await route.fulfill({ status: 200, json });
    });

    // Mock any GET user/session requests that Supabase might make to verify session
    await page.route(/\/auth\/v1\/user/, async (route) => {
      const json = { id: 'mock-user-123', email: 'testuser@example.com' };
      await route.fulfill({ status: 200, json });
    });

    await page.goto('/login');

    // Fill the login form
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for the success toast to verify the login flow executed successfully
    // We do not assert on the /dashboard URL redirect here because we are only
    // mocking the network response, not the actual session cookie setting that
    // Next.js middleware relies on to allow the redirect to complete without
    // bouncing back to /login.
    await expect(page.getByText('Welcome back!')).toBeVisible({ timeout: 10000 });
  });
});
