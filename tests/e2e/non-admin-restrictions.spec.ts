/**
 * ISSUE-#100: E2E tests for Non-Admin Item Add Restrictions
 *
 * End-to-end Playwright tests verifying that non-admin users cannot add items.
 *
 * Security Focus:
 * - Verifies client-side UI controls hide add buttons for non-admins
 * - Verifies server-side RLS policy blocks API insert attempts
 * - Tests both positive (admin can add) and negative (non-admin cannot) cases
 *
 * Test data seeding infrastructure:
 * - Generates unique trip ID per test for isolation
 * - Seeds trip with REGULAR member (not admin) using makeAdmin: false
 * - Cleans up test data after each test
 */

import { test, expect } from '@playwright/test';
import {
  seedMemberManagementTestData,
  cleanupMemberManagementTestData,
  deterministicUUID,
  type SeedTestDataResult,
} from './helpers/seed-test-data';

// Map of project names to their e2e usernames for test data seeding
const PROJECT_USERNAME_MAP: Record<string, string> = {
  chromium: 'e2e_chromium',
  firefox: 'e2e_firefox',
  webkit: 'e2e_webkit',
};

test.describe('Non-Admin Item Add Restrictions', () => {
  let seedResult: SeedTestDataResult | null = null;
  let currentTripId: string = '';

  test.beforeEach(async ({ page }, testInfo) => {
    // Generate a unique trip ID for each test to ensure test isolation
    currentTripId = deterministicUUID(`non-admin-${testInfo.testId}`);

    // Get the project-specific username to ensure the trip is created for the authenticated user
    const projectName = testInfo.project.name;
    const projectUsername = PROJECT_USERNAME_MAP[projectName] || 'e2e_chromium';

    // Seed trip with REGULAR member (NOT admin)
    seedResult = await seedMemberManagementTestData({
      tripId: currentTripId,
      projectUsername,
      makeAdmin: false, // Current user is a regular member, not admin
    });

    // Wait for database to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Navigate to trip dashboard
    await page.goto(`/dashboard/trips/${currentTripId}`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for the trip dashboard page to be visible
    await expect(page.getByTestId('trip-dashboard-page')).toBeVisible({ timeout: 15000 });
  });

  test.afterEach(async () => {
    if (currentTripId && seedResult) {
      const authUserIds = seedResult.createdAuthUserId ? [seedResult.createdAuthUserId] : [];
      await cleanupMemberManagementTestData(currentTripId, authUserIds);
    }
    seedResult = null;
  });

  test('non-admin cannot see plus icon in column header', async ({ page }) => {
    // Wait for the kanban board to be visible
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

    // Look for the plus icon in the column header
    // The plus button has title="Add new item"
    const addButton = page.locator('button[title="Add new item"]');

    // Verify the add button is NOT visible for non-admin users
    await expect(addButton).not.toBeVisible({ timeout: 5000 });
  });

  test('non-admin cannot see AddItemCard on hover', async ({ page }) => {
    // Wait for the kanban board to be visible
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

    // Find the unassigned column
    const unassignedColumn = page.locator('.group').filter({ hasText: 'Unassigned' }).first();

    // Scroll the column into view if needed
    await unassignedColumn.scrollIntoViewIfNeeded();

    // Hover over the column to trigger the group-hover effect
    await unassignedColumn.hover({ timeout: 5000 });

    // Wait a bit for any animations
    await page.waitForTimeout(500);

    // Look for the AddItemCard (it has data-testid="add-item-card")
    const addItemCard = page.getByTestId('add-item-card');

    // Verify the AddItemCard is NOT visible for non-admin users
    await expect(addItemCard.first()).not.toBeVisible({ timeout: 3000 });
  });

  test('non-admin cannot add item via direct API call', async ({ page }) => {
    // This test verifies that the server-side RLS policy blocks non-admin inserts
    // even if the client-side UI controls are bypassed

    // Get environment variables from Node.js context
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Get the auth session access token from localStorage (Supabase stores it there)
    const sessionData = await page.evaluate(() => {
      // Try to get session from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
          try {
            const session = JSON.parse(localStorage.getItem(key) || '{}');
            // The access token is at session.access_token
            return session.access_token || null;
          } catch {
            return null;
          }
        }
      }
      return null;
    });

    expect(sessionData).not.toBeNull();
    expect(sessionData).toBeDefined();

    // Make a direct fetch request to Supabase REST API
    const response = await page.evaluate(
      async ({ url, key, token, tripId }) => {
        const res = await fetch(`${url}/rest/v1/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: key,
            Authorization: `Bearer ${token}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            trip_id: tripId,
            name: 'Unauthorized Item',
            required_count: 1,
            category: 'Essentials',
            claim_type: 'single',
            status: 'needed',
          }),
        });

        const contentType = res.headers.get('content-type');
        const isJson = contentType?.includes('application/json');
        const data = isJson ? await res.json() : await res.text();

        return {
          ok: res.ok,
          status: res.status,
          data,
        };
      },
      { url: supabaseUrl, key: supabaseAnonKey, token: sessionData, tripId: currentTripId }
    );

    // Verify that the insert was blocked by the RLS policy
    // The response should either be an error (4xx) or contain error details
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);

    // Additional check: if response contains data, it should be empty or have an error
    if (typeof response.data === 'object' && response.data !== null) {
      // If it's a JSON response with data, the insert succeeded (this is a failure)
      if (Array.isArray(response.data) && response.data.length > 0) {
        throw new Error('RLS policy violation: Non-admin was able to insert item via API!');
      }
    }
  });

  test('admin CAN see add controls (positive control)', async ({ page }) => {
    // This is a positive control test to verify that admins CAN see the add controls
    // We need to clean up the non-admin trip and create a new one with admin user

    // Clean up the non-admin trip first
    if (currentTripId && seedResult) {
      await cleanupMemberManagementTestData(currentTripId, [seedResult.createdAuthUserId!]);
    }

    // Create a new trip with admin user
    const adminSeedResult = await seedMemberManagementTestData({
      tripId: currentTripId,
      projectUsername: 'e2e_chromium',
      makeAdmin: true, // Now the user is an admin
    });

    // Wait for database to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Reload the page to fetch the new admin status
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Wait for the kanban board to be visible
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

    // Look for the plus icon in the column header
    const addButton = page.locator('button[title="Add new item"]');

    // Verify the add button IS visible for admin users
    await expect(addButton).toBeVisible({ timeout: 5000 });

    // Also verify the AddItemCard is visible on hover
    const unassignedColumn = page.locator('.group').filter({ hasText: 'Unassigned' }).first();
    await unassignedColumn.scrollIntoViewIfNeeded();
    await unassignedColumn.hover({ timeout: 5000 });
    await page.waitForTimeout(500);

    const addItemCard = page.getByTestId('add-item-card');
    await expect(addItemCard.first()).toBeVisible({ timeout: 3000 });

    // Clean up the admin trip
    await cleanupMemberManagementTestData(currentTripId, [adminSeedResult.createdAuthUserId!]);
  });

  test('non-admin cannot open add item dialog via keyboard navigation', async ({ page }) => {
    // Wait for the kanban board to be visible
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

    // Try to find and focus the add button using keyboard navigation
    // Press Tab multiple times to see if we can find an add button
    let foundAddButton = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const focusedElement = await page.evaluate(() =>
        document.activeElement?.getAttribute('title')
      );
      if (focusedElement === 'Add new item') {
        foundAddButton = true;
        break;
      }
    }

    // Verify we cannot find an add button to focus
    expect(foundAddButton).toBe(false);
  });

  test('non-admin sees empty state but no add controls', async ({ page }) => {
    // Wait for the kanban board to be visible
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

    // The unassigned column should show "No items yet" when empty
    const unassignedColumn = page.locator('.group').filter({ hasText: 'Unassigned' }).first();
    await expect(unassignedColumn).toBeVisible();

    // Check for empty state message
    const hasEmptyState = (await unassignedColumn.getByText('No items yet').count()) > 0;
    if (hasEmptyState) {
      await expect(unassignedColumn.getByText('No items yet')).toBeVisible();
    }

    // But there should be NO add item card
    const addItemCard = page.getByTestId('add-item-card');
    await expect(addItemCard.first()).not.toBeVisible({ timeout: 3000 });
  });
});
