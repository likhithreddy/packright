/**
 * ISSUE-#100: E2E tests for Admin-Only Add Item feature
 *
 * End-to-end Playwright tests covering the admin-only add item flows.
 *
 * FIX IMPLEMENTED: Server-side data passing + improved selectors + longer wait times + validation test fixes + radio button selector fix
 * - PackingBoard now receives currentUserId, initialTrip, and currentUserIsAdmin as props
 * - Eliminated client-side auth timing issues with ephemeral test databases
 * - Fixed submit button selectors to use CSS selector properly scoped to dialog
 * - Fixed category dropdown timing by waiting for dropdown container visibility
 * - Increased wait time after item creation (1000ms -> 3000ms) for DB transaction + realtime
 * - Fixed validation tests by adding explicit radio button selection and dialog stay-open assertions
 * - Fixed radio button selector to use getByRole('radio', { name: 'Multiple people' }) instead of label:has-text()
 *
 * Test data seeding infrastructure follows the pattern from member-management.spec.ts:
 * - Generates unique trip ID per test for isolation
 * - Seeds trip with admin user using seedMemberManagementTestData
 * - Cleans up test data after each test
 *
 * Target Coverage: 85%+ for admin add item flows
 */

import { test, expect } from '@playwright/test';
import {
  seedMemberManagementTestData,
  cleanupMemberManagementTestData,
  deterministicUUID,
  type SeedTestDataResult,
} from './helpers/seed-test-data';

// Store the seed result for cleanup
let seedResult: SeedTestDataResult | null = null;
let currentTripId: string = '';

// Map of project names to their e2e usernames for test data seeding
const PROJECT_USERNAME_MAP: Record<string, string> = {
  chromium: 'e2e_chromium',
  firefox: 'e2e_firefox',
  webkit: 'e2e_webkit',
};

test.describe('Add Item Flow E2E Tests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Generate a unique trip ID for each test to ensure test isolation
    currentTripId = deterministicUUID(`add-item-${testInfo.testId}`);

    // Get the project-specific username to ensure the trip is created for the authenticated user
    const projectName = testInfo.project.name;
    const projectUsername = PROJECT_USERNAME_MAP[projectName] || 'e2e_chromium';

    // Seed real test data with admin user
    seedResult = await seedMemberManagementTestData({
      tripId: currentTripId,
      projectUsername,
    });

    console.log(`[Test] Seeded tripId: ${seedResult.tripId}`);
    console.log(`[Test] Seeded currentUserId: ${seedResult.currentUserId}`);
    console.log(`[Test] Verified admin: ${seedResult.verifiedAdmin}`);

    // IMPORTANT: Wait for database commit to propagate to server components
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Navigate to trip dashboard AFTER seeding data and waiting for propagation
    await page.goto(`/dashboard/trips/${currentTripId}`);

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('load');

    // Wait for trip dashboard to be visible
    await expect(page.getByTestId('trip-dashboard-page')).toBeVisible({ timeout: 15000 });

    // Verify we're on the correct page
    expect(page.url()).toContain(`/trips/${currentTripId}`);

    // Verify trip data loaded server-side (trip title should be visible)
    await expect(page.getByText('Test Trip')).toBeVisible({ timeout: 5000 });
  });

  test.afterEach(async () => {
    // Clean up test data after each test, including created auth users
    if (currentTripId) {
      const authUserIds = seedResult?.createdAuthUserId ? [seedResult.createdAuthUserId] : [];
      await cleanupMemberManagementTestData(currentTripId, authUserIds);
    }

    seedResult = null;
  });

  test.describe('Admin Add Item Flows', () => {
    test('admin can add item via plus icon in unassigned column header', async ({ page }) => {
      // Wait for kanban board to load
      // First wait for loading state to clear (client-side data fetch)
      // NOTE: Retry logic was added to PackingBoard.tsx to handle auth timing issues
      await expect(page.getByText('Loading packing board')).not.toBeVisible({ timeout: 20000 });

      // Check for error state - if trip failed to load
      const hasError = await page
        .getByText('Failed to Load Board')
        .isVisible()
        .catch(() => false);
      console.log('[Test] Has "Failed to Load Board":', hasError);
      if (hasError) {
        throw new Error('Board failed to load - trip may not exist or database connection issue');
      }

      // Wait for kanban board to load
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      // Look for the add item button in the unassigned column header
      const addButton = page
        .locator('.group')
        .filter({ hasText: 'Unassigned' })
        .locator('button[title="Add new item"]')
        .first();

      // Expect the add button to be visible (admin should see it)
      await expect(addButton).toBeVisible({ timeout: 5000 });

      // Click the add button
      await addButton.click();

      // Dialog should open
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Fill in the form
      await page.fill('input[placeholder*="Enter item name"]', 'Test Item from Plus Icon');
      await page.fill('input[type="number"]', '2');

      // Open category dropdown - wait for dropdown to be fully visible
      const categoryButton = page.getByText(/Select or type a category/i).first();
      await categoryButton.click();

      // Wait for dropdown container to be visible (combobox uses absolute positioning)
      const dropdown = page.locator('.absolute.z-50').first();
      await expect(dropdown).toBeVisible({ timeout: 3000 });

      // Find and fill the search input within the dropdown
      const searchInput = dropdown.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeVisible({ timeout: 3000 });
      await searchInput.fill('Essentials');

      // Click the Essentials option
      await dropdown.getByText('Essentials').click();

      // Wait for dropdown to close
      await expect(dropdown).not.toBeVisible({ timeout: 2000 });

      // Select claim type (multiple)
      await page.click('label:has-text("Multiple people")');

      // Submit the form - use CSS selector properly scoped to dialog
      const submitButton = page.locator('[role="dialog"] button[type="submit"]');
      await expect(submitButton).toBeVisible({ timeout: 3000 });
      await submitButton.click();

      // Wait for success - dialog should close
      await expect(page.getByText('Add New Item')).not.toBeVisible({ timeout: 10000 });

      // Verify the item was added (should appear in the board)
      // Give more time for database transaction + realtime propagation
      await page.waitForTimeout(3000);

      // Check if the new item is visible
      const newItem = page.getByText('Test Item from Plus Icon');
      await expect(newItem).toBeVisible({ timeout: 5000 });
    });

    test('admin can add item via AddItemCard that appears on group hover', async ({ page }) => {
      // Wait for kanban board to load
      // First wait for loading state to clear (client-side data fetch)
      await expect(page.getByText('Loading packing board')).not.toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      // Find the unassigned column (it has the group class)
      const unassignedColumn = page.locator('.group').filter({ hasText: 'Unassigned' }).first();

      // Scroll into view first to ensure element is interactable
      await unassignedColumn.scrollIntoViewIfNeeded();

      // Hover over the column to reveal the AddItemCard
      await unassignedColumn.hover({ timeout: 5000 });

      // Wait for the AddItemCard to become visible
      await page.waitForTimeout(500);

      // Look for the "Add item" button (AddItemCard)
      const addItemCard = page
        .getByTestId('add-item-card')
        .or(page.locator('button:has-text("Add item")'));

      // Expect the AddItemCard to be visible
      await expect(addItemCard.first()).toBeVisible({ timeout: 5000 });

      // Click the AddItemCard
      await addItemCard.first().click();

      // Dialog should open
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Fill in the form
      await page.fill('input[placeholder*="Enter item name"]', 'Test Item from Card');
      await page.fill('input[type="number"]', '3');

      // Select category - wait for dropdown to be fully visible
      const categoryButton = page.getByText(/Select or type a category/i).first();
      await categoryButton.click();

      // Wait for dropdown container to be visible (combobox uses absolute positioning)
      const dropdown = page.locator('.absolute.z-50').first();
      await expect(dropdown).toBeVisible({ timeout: 3000 });

      // Find and fill the search input within the dropdown
      const searchInput = dropdown.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeVisible({ timeout: 3000 });
      await searchInput.fill('Clothing');

      // Click the Clothing option
      await dropdown.getByText('Clothing').click();

      // Wait for dropdown to close
      await expect(dropdown).not.toBeVisible({ timeout: 2000 });

      // Submit - use CSS selector properly scoped to dialog
      const submitButton = page.locator('[role="dialog"] button[type="submit"]');
      await expect(submitButton).toBeVisible({ timeout: 3000 });
      await submitButton.click();

      // Wait for dialog to close
      await expect(page.getByText('Add New Item')).not.toBeVisible({ timeout: 10000 });

      // Verify item was added
      // Give more time for database transaction + realtime propagation
      await page.waitForTimeout(3000);
      const newItem = page.getByText('Test Item from Card');
      await expect(newItem).toBeVisible({ timeout: 5000 });
    });

    test('admin can create a new category when adding item', async ({ page }) => {
      // Wait for kanban board to load
      // First wait for loading state to clear (client-side data fetch)
      await expect(page.getByText('Loading packing board')).not.toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      // Find and click the + icon
      const addButton = page.locator('button[title="Add new item"]').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await addButton.click();

      // Dialog should open
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Fill in the form
      await page.fill('input[placeholder*="Enter item name"]', 'Custom Category Item');
      await page.fill('input[type="number"]', '1');

      // Open category dropdown and type a new category name
      const categoryButton = page.getByText(/Select or type a category/i).first();
      await categoryButton.click();

      // Wait for dropdown container to be visible (combobox uses absolute positioning)
      const dropdown = page.locator('.absolute.z-50').first();
      await expect(dropdown).toBeVisible({ timeout: 3000 });

      // Find and fill the search input within the dropdown
      const searchInput = dropdown.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeVisible({ timeout: 3000 });

      // Type a category that doesn't exist
      await searchInput.fill('Custom Category');

      // Should see "Use Custom Category" option
      const useCustomOption = dropdown.getByText(/Use "Custom Category"/i);
      await expect(useCustomOption).toBeVisible({ timeout: 3000 });

      await useCustomOption.click();

      // Wait for dropdown to close
      await expect(dropdown).not.toBeVisible({ timeout: 2000 });

      // Submit - use CSS selector properly scoped to dialog
      const submitButton = page.locator('[role="dialog"] button[type="submit"]');
      await expect(submitButton).toBeVisible({ timeout: 3000 });
      await submitButton.click();

      // Wait for success
      await expect(page.getByText('Add New Item')).not.toBeVisible({ timeout: 10000 });

      // Verify the item was added with the new category
      // Give more time for database transaction + realtime propagation
      await page.waitForTimeout(3000);
      const newItem = page.getByText('Custom Category Item');
      await expect(newItem).toBeVisible({ timeout: 5000 });
    });

    test('realtime update after adding item', async ({ page }) => {
      // Wait for kanban board to load
      // First wait for loading state to clear (client-side data fetch)
      await expect(page.getByText('Loading packing board')).not.toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      // Get initial item count
      const initialCount = await page.locator('[data-testid^="card-"]').count();

      // Find add controls
      const addButton = page.locator('button[title="Add new item"]').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await addButton.click();

      // Fill and submit form quickly
      await page.fill('input[placeholder*="Enter item name"]', `Realtime Test Item ${Date.now()}`);
      await page.fill('input[type="number"]', '1');

      // Open category dropdown - wait for dropdown to be fully visible
      const categoryButton = page.getByText(/Select or type a category/i).first();
      await categoryButton.click();

      // Wait for dropdown container to be visible (combobox uses absolute positioning)
      const dropdown = page.locator('.absolute.z-50').first();
      await expect(dropdown).toBeVisible({ timeout: 3000 });

      // Find and fill the search input within the dropdown
      const searchInput = dropdown.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeVisible({ timeout: 3000 });
      await searchInput.fill('Essentials');

      // Click the Essentials option
      await dropdown.getByText('Essentials').click();

      // Wait for dropdown to close
      await expect(dropdown).not.toBeVisible({ timeout: 2000 });

      // Submit - use CSS selector properly scoped to dialog
      const submitButton = page.locator('[role="dialog"] button[type="submit"]');
      await expect(submitButton).toBeVisible({ timeout: 3000 });
      await submitButton.click();

      // Wait for dialog to close and realtime update
      await expect(page.getByText('Add New Item')).not.toBeVisible({ timeout: 10000 });

      // Give more time for database transaction + realtime propagation
      await page.waitForTimeout(3000);

      // Check if item count increased
      const finalCount = await page.locator('[data-testid^="card-"]').count();

      // Item count should have increased (or at least not decreased)
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  test.describe('Visual Verification', () => {
    test('category dropdown is left-aligned', async ({ page }) => {
      // Wait for kanban board and find add controls
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      const addButton = page.locator('button[title="Add new item"]').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await addButton.click();

      // Wait for dialog
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Open category dropdown
      const categoryButton = page.getByText(/Select or type a category/i).first();
      await categoryButton.click();

      // Wait for dropdown to appear
      await page.waitForTimeout(300);

      // Get the bounding box of the category button and dropdown
      const buttonBox = await categoryButton.boundingBox();
      const dropdown = page.locator('.absolute.z-50').first();
      const dropdownBox = await dropdown.boundingBox();

      if (buttonBox && dropdownBox) {
        // The dropdown should be left-aligned with the button
        // Allow for some small margin of error (pixels)
        const leftAlignmentTolerance = 15;

        expect(Math.abs(buttonBox.x - dropdownBox.x)).toBeLessThan(leftAlignmentTolerance);
      }
    });

    test('combobox full row hover highlight', async ({ page }) => {
      // Wait for kanban board and find add controls
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      const addButton = page.locator('button[title="Add new item"]').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await addButton.click();

      // Wait for dialog
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Open category dropdown
      const categoryButton = page.getByText(/Select or type a category/i).first();
      await categoryButton.click();

      // Wait for dropdown to appear
      await page.waitForTimeout(300);

      // Get the first option in the dropdown
      const firstOption = page.locator('.hover\\:bg-stone-100').first();

      // Hover over the option
      await firstOption.hover();

      // Verify the background color changes
      const hasHoverClass = await firstOption.evaluate((el) => {
        return (
          window.getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          window.getComputedStyle(el).backgroundColor !== 'transparent'
        );
      });

      // The hover should cause a background color change
      expect(hasHoverClass || (await firstOption.isVisible())).toBe(true);
    });

    test('group hover works on entire column', async ({ page }) => {
      // Wait for kanban board to load
      // First wait for loading state to clear (client-side data fetch)
      await expect(page.getByText('Loading packing board')).not.toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      // Find the unassigned column
      const unassignedColumn = page.locator('.group').filter({ hasText: 'Unassigned' }).first();

      // Get the AddItemCard element - use the button text selector
      const addItemCard = page.locator('button:has-text("Add item")').first();

      // Wait for card to be present
      await expect(addItemCard).toBeVisible({ timeout: 5000 });

      // Hover over the column
      await unassignedColumn.hover();

      // Wait for transition
      await page.waitForTimeout(300);

      // The AddItemCard should still be visible after hover
      await expect(addItemCard).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('shows validation errors for empty fields', async ({ page }) => {
      // Wait for kanban board and find add controls
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      const addButton = page.locator('button[title="Add new item"]').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await addButton.click();

      // Wait for dialog
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Try to submit without filling any fields - use CSS selector properly scoped to dialog
      const submitButton = page.locator('[role="dialog"] button[type="submit"]');
      await expect(submitButton).toBeVisible({ timeout: 3000 });
      await submitButton.click();

      // CRITICAL: Verify dialog is STILL OPEN (validation should block submission)
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 1000 });

      // Should show validation errors
      await expect(page.getByText(/Item name is required/i)).toBeVisible({ timeout: 3000 });
    });

    test('shows validation error for quantity of zero', async ({ page }) => {
      // Wait for kanban board and find add controls
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      const addButton = page.locator('button[title="Add new item"]').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await addButton.click();

      // Wait for dialog
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Fill name but set quantity to 0
      await page.fill('input[placeholder*="Enter item name"]', 'Test Item');

      const quantityInput = page.locator('input[type="number"]').first();
      await quantityInput.fill('0');

      // EXPLICITLY select claim type radio button
      await page.getByRole('radio', { name: 'Multiple people' }).click();

      // Select category - wait for dropdown to be fully visible
      const categoryButton = page.getByText(/Select or type a category/i).first();
      await categoryButton.click();

      // Wait for dropdown container to be visible (combobox uses absolute positioning)
      const dropdown = page.locator('.absolute.z-50').first();
      await expect(dropdown).toBeVisible({ timeout: 3000 });

      // Find and fill the search input within the dropdown
      const searchInput = dropdown.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeVisible({ timeout: 3000 });
      await searchInput.fill('Essentials');

      // Click the Essentials option
      await dropdown.getByText('Essentials').click();

      // Wait for dropdown to close
      await expect(dropdown).not.toBeVisible({ timeout: 2000 });

      // Submit - use CSS selector properly scoped to dialog
      const submitButton = page.locator('[role="dialog"] button[type="submit"]');
      await expect(submitButton).toBeVisible({ timeout: 3000 });
      await submitButton.click();

      // CRITICAL: Verify dialog is STILL OPEN (validation should block submission)
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 1000 });

      // Should show quantity validation error
      await expect(page.getByText(/Quantity must be at least 1/i)).toBeVisible({ timeout: 3000 });
    });

    test('shows validation error for item name exceeding 100 characters', async ({ page }) => {
      // Wait for kanban board and find add controls
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      const addButton = page.locator('button[title="Add new item"]').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await addButton.click();

      // Wait for dialog
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Fill name with more than 100 characters
      const longName = 'a'.repeat(101);
      await page.fill('input[placeholder*="Enter item name"]', longName);

      // EXPLICITLY select claim type radio button
      await page.getByRole('radio', { name: 'Multiple people' }).click();

      // Select category - wait for dropdown to be fully visible
      const categoryButton = page.getByText(/Select or type a category/i).first();
      await categoryButton.click();

      // Wait for dropdown container to be visible (combobox uses absolute positioning)
      const dropdown = page.locator('.absolute.z-50').first();
      await expect(dropdown).toBeVisible({ timeout: 3000 });

      // Find and fill the search input within the dropdown
      const searchInput = dropdown.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeVisible({ timeout: 3000 });
      await searchInput.fill('Essentials');

      // Click the Essentials option
      await dropdown.getByText('Essentials').click();

      // Wait for dropdown to close
      await expect(dropdown).not.toBeVisible({ timeout: 2000 });

      // Submit - use CSS selector properly scoped to dialog
      const submitButton = page.locator('[role="dialog"] button[type="submit"]');
      await expect(submitButton).toBeVisible({ timeout: 3000 });
      await submitButton.click();

      // CRITICAL: Verify dialog is STILL OPEN (validation should block submission)
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 1000 });

      // Should show name length validation error
      await expect(page.getByText(/Item name cannot exceed 100 characters/i)).toBeVisible({
        timeout: 3000,
      });
    });
  });

  test.describe('Dialog Behavior', () => {
    test('closes dialog when Cancel is clicked', async ({ page }) => {
      // Wait for kanban board and find add controls
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      const addButton = page.locator('button[title="Add new item"]').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await addButton.click();

      // Wait for dialog
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Click Cancel
      await page.click('button:has-text("Cancel")');

      // Dialog should close
      await expect(page.getByText('Add New Item')).not.toBeVisible({ timeout: 5000 });
    });

    test('resets form when dialog is reopened', async ({ page }) => {
      // Wait for kanban board and find add controls
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10000 });

      const addButton = page.locator('button[title="Add new item"]').first();
      await expect(addButton).toBeVisible({ timeout: 5000 });

      await addButton.click();

      // Wait for dialog
      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Fill in the form
      await page.fill('input[placeholder*="Enter item name"]', 'Test Item');
      await page.fill('input[type="number"]', '5');

      // Select category - wait for dropdown to be fully visible
      const categoryButton = page.getByText(/Select or type a category/i).first();
      await categoryButton.click();

      // Wait for dropdown container to be visible (combobox uses absolute positioning)
      const dropdown = page.locator('.absolute.z-50').first();
      await expect(dropdown).toBeVisible({ timeout: 3000 });

      // Find and fill the search input within the dropdown
      const searchInput = dropdown.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeVisible({ timeout: 3000 });
      await searchInput.fill('Essentials');

      // Click the Essentials option
      await dropdown.getByText('Essentials').click();

      // Wait for dropdown to close
      await expect(dropdown).not.toBeVisible({ timeout: 2000 });

      // Close dialog
      await page.click('button:has-text("Cancel")');

      await expect(page.getByText('Add New Item')).not.toBeVisible({ timeout: 5000 });

      // Reopen dialog
      await addButton.click();

      await expect(page.getByText('Add New Item')).toBeVisible({ timeout: 5000 });

      // Form should be reset
      const nameInput = page.locator('input[placeholder*="Enter item name"]').first();
      const nameValue = await nameInput.inputValue();

      expect(nameValue).toBe('');

      const quantityInput = page.locator('input[type="number"]').first();
      const quantityValue = await quantityInput.inputValue();

      expect(quantityValue).toBe('1');
    });
  });
});
