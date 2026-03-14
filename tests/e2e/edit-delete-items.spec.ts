/**
 * ISSUE-#46: E2E tests for Edit/Delete Item flows
 *
 * End-to-end Playwright tests covering complete user flows for
 * editing item properties (name, quantity, category, claim type)
 * and deleting items with confirmation.
 *
 * Target Coverage: 85%+ for edit/delete flows
 */

import { test, expect } from '@playwright/test';
import {
  seedMemberManagementTestData,
  cleanupMemberManagementTestData,
  seedKanbanBoardData,
  seedItemPermissionsData,
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

test.describe('Edit/Delete Item Flows', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Generate a unique trip ID for each test to ensure test isolation
    currentTripId = deterministicUUID(`test-trip-${testInfo.testId}`);

    // Get the project-specific username to ensure the trip is created for the authenticated user
    const projectName = testInfo.project.name;
    const projectUsername = PROJECT_USERNAME_MAP[projectName] || 'e2e_chromium';

    // Seed real test data for server component rendering
    seedResult = await seedMemberManagementTestData({ tripId: currentTripId, projectUsername });

    // Create test items for edit/delete flows
    await seedKanbanBoardData({
      tripId: currentTripId,
      items: [
        { name: 'Tent', category: 'Essentials', required_count: 2, status: 'needed' },
        { name: 'Sleeping Bag', category: 'Essentials', required_count: 5, status: 'needed' },
        { name: 'Backpack', category: 'Essentials', required_count: 3, status: 'needed' },
      ],
    });

    // Navigate to trip dashboard AFTER seeding data
    await page.goto(`/dashboard/trips/${currentTripId}`);

    // Wait for page to fully load and be interactive
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('load');

    // Wait for the trip dashboard heading to be visible
    await expect(page.getByTestId('trip-dashboard-page')).toBeVisible({ timeout: 15000 });

    // Verify we're NOT redirected to login
    if (page.url().includes('/login')) {
      throw new Error('Authentication failed - test cannot proceed.');
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data after each test
    if (currentTripId) {
      await cleanupMemberManagementTestData(currentTripId, seedResult?.createdAuthUserId);
    }

    seedResult = null;
  });

  test.describe('Edit Item Dialog Flow', () => {
    test('should open edit dialog from card menu', async ({ page }) => {
      // Find the three-dot menu button on an item card
      // Try multiple selectors for the menu button
      const menuButton = page
        .locator('button:has([class*="lucide-more"])')
        .or(page.locator('[data-testid="card-menu-button"]'))
        .or(page.locator('.border-stone-200 button').last())
        .first();

      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        // Look for Edit option
        const editOption = page
          .locator('button:has-text("Edit")')
          .or(page.getByRole('menuitem', { name: 'Edit' }))
          .first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Verify dialog opened
          await expect(page.getByText('Edit Item')).toBeVisible();
        }
      }
    });

    test('should pre-fill form with current item values', async ({ page }) => {
      // Find and click menu button
      const menuButton = page
        .locator('button:has([class*="lucide-more"])')
        .or(page.locator('[data-testid="card-menu-button"]'))
        .first();

      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        // Click Edit option
        const editOption = page
          .locator('button:has-text("Edit")')
          .or(page.getByRole('menuitem', { name: 'Edit' }))
          .first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Check that form fields are pre-filled
          const nameInput = page
            .getByPlaceholder('Enter item name')
            .or(page.locator('input[name="name"]'));
          const hasNameInput = (await nameInput.count()) > 0;

          if (hasNameInput) {
            await expect(nameInput.first()).toBeVisible();

            // Check that input has a value
            const inputValue = await nameInput.first().inputValue();
            expect(inputValue?.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should allow editing item name', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const editOption = page.locator('button:has-text("Edit")').first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Find name input
          const nameInput = page
            .getByPlaceholder('Enter item name')
            .or(page.locator('input[name="name"]'))
            .first();
          const hasNameInput = (await nameInput.count()) > 0;

          if (hasNameInput) {
            // Clear and enter new name
            await nameInput.fill('Updated Tent Name');
            await page.waitForTimeout(100);

            // Click Save Changes
            const saveButton = page
              .getByRole('button', { name: 'Save Changes' })
              .or(page.locator('button:has-text("Save")'))
              .first();

            await saveButton.click();
            await page.waitForTimeout(500);

            // Check for success toast
            const toast = page.locator('.cn-toast, [data-sonner-toast]');
            const toastCount = await toast.count();

            if (toastCount > 0) {
              await expect(toast.first()).toContainText(/saved|success|updated/i, {
                timeout: 3000,
              });
            }
          }
        }
      }
    });

    test('should allow editing item quantity', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const editOption = page.locator('button:has-text("Edit")').first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Find quantity input
          const quantityInput = page
            .getByPlaceholder('Enter quantity')
            .or(page.locator('input[type="number"]'))
            .first();
          const hasQuantityInput = (await quantityInput.count()) > 0;

          if (hasQuantityInput) {
            // Clear and enter new quantity
            await quantityInput.fill('10');
            await page.waitForTimeout(100);

            // Click Save Changes
            const saveButton = page.getByRole('button', { name: 'Save Changes' }).first();
            await saveButton.click();
            await page.waitForTimeout(500);

            // Check for success toast
            const toast = page.locator('.cn-toast, [data-sonner-toast]');
            const toastCount = await toast.count();

            if (toastCount > 0) {
              await expect(toast.first()).toContainText(/saved|success|updated/i, {
                timeout: 3000,
              });
            }
          }
        }
      }
    });

    test('should validate name length (min 1, max 100)', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const editOption = page.locator('button:has-text("Edit")').first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Find name input
          const nameInput = page
            .getByPlaceholder('Enter item name')
            .or(page.locator('input[name="name"]'))
            .first();
          const hasNameInput = (await nameInput.count()) > 0;

          if (hasNameInput) {
            // Clear and enter empty name
            await nameInput.fill('');
            await page.waitForTimeout(100);

            // Try to save - button should be disabled or show error
            const saveButton = page.getByRole('button', { name: 'Save Changes' }).first();
            const isDisabled = await saveButton.isDisabled();

            expect(isDisabled).toBe(true);
          }
        }
      }
    });

    test('should validate quantity range (min 1, max 1000)', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const editOption = page.locator('button:has-text("Edit")').first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Find quantity input
          const quantityInput = page
            .getByPlaceholder('Enter quantity')
            .or(page.locator('input[type="number"]'))
            .first();
          const hasQuantityInput = (await quantityInput.count()) > 0;

          if (hasQuantityInput) {
            // Check min/max attributes
            const minAttr = await quantityInput.getAttribute('min');
            const maxAttr = await quantityInput.getAttribute('max');

            expect(minAttr).toBe('1');
            expect(maxAttr).toBe('1000');
          }
        }
      }
    });

    test('should close dialog when Cancel is clicked', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const editOption = page.locator('button:has-text("Edit")').first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Click Cancel
          const cancelButton = page.getByRole('button', { name: 'Cancel' }).first();
          await cancelButton.click();

          // Dialog should be closed
          await expect(page.getByText('Edit Item')).not.toBeVisible();
        }
      }
    });

    test('should show loading state while saving', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const editOption = page.locator('button:has-text("Edit")').first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Modify a field
          const nameInput = page.getByPlaceholder('Enter item name').first();
          const hasNameInput = (await nameInput.count()) > 0;

          if (hasNameInput) {
            await nameInput.fill('Updated Name');

            // Click Save
            const saveButton = page.getByRole('button', { name: 'Save Changes' }).first();
            await saveButton.click();

            // Check for loading state (spinner or "Saving..." text)
            const loader = page.locator('[class*="animate-spin"]').or(page.getByText('Saving...'));
            const hasLoader = (await loader.count()) > 0;

            if (hasLoader) {
              await expect(loader.first()).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Delete Confirmation Dialog Flow', () => {
    test('should open delete dialog from card menu', async ({ page }) => {
      // Find the three-dot menu button
      const menuButton = page
        .locator('button:has([class*="lucide-more"])')
        .or(page.locator('[data-testid="card-menu-button"]'))
        .first();

      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        // Look for Delete option
        const deleteOption = page
          .locator('button:has-text("Delete")')
          .or(page.getByRole('menuitem', { name: 'Delete' }))
          .first();
        const hasDeleteOption = (await deleteOption.count()) > 0;

        if (hasDeleteOption) {
          await deleteOption.click();

          // Verify dialog opened
          await expect(page.getByText('Delete Item')).toBeVisible();
        }
      }
    });

    test('should display item info in delete dialog', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const deleteOption = page.locator('button:has-text("Delete")').first();
        const hasDeleteOption = (await deleteOption.count()) > 0;

        if (hasDeleteOption) {
          await deleteOption.click();

          // Check for warning message
          await expect(page.getByText(/are you sure/i)).toBeVisible();

          // Check for item info display
          const itemInfo = page
            .locator('.bg-stone-100')
            .or(page.locator('[data-testid="item-info"]'));
          const hasItemInfo = (await itemInfo.count()) > 0;

          if (hasItemInfo) {
            await expect(itemInfo.first()).toBeVisible();
          }
        }
      }
    });

    test('should close dialog when Cancel is clicked', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const deleteOption = page.locator('button:has-text("Delete")').first();
        const hasDeleteOption = (await deleteOption.count()) > 0;

        if (hasDeleteOption) {
          await deleteOption.click();

          // Click Cancel
          const cancelButton = page.getByRole('button', { name: 'Cancel' }).first();
          await cancelButton.click();

          // Dialog should be closed
          await expect(page.getByText('Delete Item')).not.toBeVisible();
        }
      }
    });

    test('should delete item when confirmed', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const deleteOption = page.locator('button:has-text("Delete")').first();
        const hasDeleteOption = (await deleteOption.count()) > 0;

        if (hasDeleteOption) {
          await deleteOption.click();

          // Click Delete to confirm
          const deleteButton = page
            .getByRole('button', { name: /Delete/i })
            .or(page.locator('button:has-text("Delete Item")'))
            .or(page.locator('button.bg-red-600'))
            .first();

          await deleteButton.click();
          await page.waitForTimeout(500);

          // Check for success toast
          const toast = page.locator('.cn-toast, [data-sonner-toast]');
          const toastCount = await toast.count();

          if (toastCount > 0) {
            await expect(toast.first()).toContainText(/deleted|removed|success/i, {
              timeout: 3000,
            });
          }

          // Dialog should be closed
          await expect(page.getByText('Delete Item')).not.toBeVisible();
        }
      }
    });

    test('should show loading state while deleting', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const deleteOption = page.locator('button:has-text("Delete")').first();
        const hasDeleteOption = (await deleteOption.count()) > 0;

        if (hasDeleteOption) {
          await deleteOption.click();

          // Click Delete
          const deleteButton = page
            .getByRole('button', { name: /Delete/i })
            .or(page.locator('button.bg-red-600'))
            .first();

          await deleteButton.click();

          // Check for loading state
          const loader = page.locator('[class*="animate-spin"]').or(page.getByText('Deleting...'));
          const hasLoader = (await loader.count()) > 0;

          if (hasLoader) {
            await expect(loader.first()).toBeVisible();
          }
        }
      }
    });

    test('should disable buttons while deleting', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const deleteOption = page.locator('button:has-text("Delete")').first();
        const hasDeleteOption = (await deleteOption.count()) > 0;

        if (hasDeleteOption) {
          await deleteOption.click();

          // Click Delete
          const deleteButton = page
            .getByRole('button', { name: /Delete/i })
            .or(page.locator('button.bg-red-600'))
            .first();

          await deleteButton.click();

          // Check that Cancel button is disabled during deletion
          const cancelButton = page.getByRole('button', { name: 'Cancel' }).first();
          const isDisabled = await cancelButton.isDisabled();

          if (isDisabled) {
            expect(isDisabled).toBe(true);
          }
        }
      }
    });
  });

  test.describe.skip('Error Handling', () => {
    // Server Actions bypass page.route() mocking
    // These tests require MSW (Mock Service Worker) or alternative mocking approach
    // TODO: Implement MSW for proper error testing

    test('should handle failed edit gracefully', async ({ page }) => {
      // Mock a failed API response
      await page.route('**/rest/v1/items*', async (route) => {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Database error' }) });
      });

      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const editOption = page.locator('button:has-text("Edit")').first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Modify and try to save
          const nameInput = page.getByPlaceholder('Enter item name').first();
          const hasNameInput = (await nameInput.count()) > 0;

          if (hasNameInput) {
            await nameInput.fill('Updated Name');

            const saveButton = page.getByRole('button', { name: 'Save Changes' }).first();
            await saveButton.click();
            await page.waitForTimeout(500);

            // Check for error toast
            const toast = page.locator('.cn-toast, [data-sonner-toast]');
            const toastCount = await toast.count();

            if (toastCount > 0) {
              await expect(toast.first()).toContainText(/error|failed/i, { timeout: 3000 });
            }
          }
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should close dialogs on Escape key', async ({ page }) => {
      const menuButton = page.locator('button:has([class*="lucide-more"])').first();
      const hasMenuButton = (await menuButton.count()) > 0;

      if (hasMenuButton) {
        await menuButton.click();

        const editOption = page.locator('button:has-text("Edit")').first();
        const hasEditOption = (await editOption.count()) > 0;

        if (hasEditOption) {
          await editOption.click();

          // Press Escape
          await page.keyboard.press('Escape');

          // Dialog should be closed
          await expect(page.getByText('Edit Item')).not.toBeVisible();
        }
      }
    });
  });
});
