import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('redirects users without username to onboarding page', async ({ page }) => {
    // Mock Supabase auth to return a session but user has no username
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'newuser@example.com',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          aud: 'authenticated',
        }),
      });
    });

    // Mock profiles table to return a profile with no username
    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'test-user-id', username: null }]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard');

    // Should be redirected to onboarding
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.locator('h1')).toContainText('Almost there!');
  });

  test('allows completing onboarding and then entering dashboard', async ({ page }) => {
    // Setup initial mock (no username)
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'newuser@example.com',
          app_metadata: { providers: ['email'] },
          aud: 'authenticated',
        }),
      });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'test-user-id', username: null }]),
        });
      } else if (method === 'PATCH' || method === 'PUT') {
        await route.fulfill({ status: 200, body: JSON.stringify({}) });
      }
    });

    // Mock RPC for username check
    await page.route('**/rest/v1/rpc/check_username_available', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(true),
      });
    });

    await page.goto('/onboarding');

    // Fill the form
    await page.fill('input[name="full_name"]', 'John Doe');
    await page.fill('input[name="username"]', 'johndoe_unique');

    // Select a color (first one)
    await page.click('button[aria-label="Select Deep Gold avatar color"]');

    // Submit
    await page.click('button:has-text("Complete Profile")');

    // Handle AlertDialog
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.click('button:has-text("I understand, save handle")');

    // Check redirection or success
    // Note: After submission, the interceptor in dashboard/layout will run again.
    // We should mock the second call to profiles to return the username.

    await page.route('**/rest/v1/profiles*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'test-user-id', username: 'johndoe_unique' }]),
        });
      }
    });

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Welcome to your Dashboard');
  });
});
