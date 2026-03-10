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
});
