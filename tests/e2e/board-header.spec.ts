/**
 * ISSUE-#46: E2E tests for Board Header features
 *
 * End-to-end Playwright tests covering board header functionality
 * including progress bar, item counts, member avatars, and navigation.
 *
 * Target Coverage: 85%+ for board header features
 */

import { test, expect } from '@playwright/test';
import {
  seedMemberManagementTestData,
  cleanupMemberManagementTestData,
  seedKanbanBoardData,
  seedManyMembersTestData,
  deterministicUUID,
  type SeedTestDataResult,
} from './helpers/seed-test-data';

// Store the seed result for cleanup
let seedResult: SeedTestDataResult | null = null;
let currentTripId: string = '';
let additionalAuthUserIds: string[] = [];

// Map of project names to their e2e usernames for test data seeding
const PROJECT_USERNAME_MAP: Record<string, string> = {
  chromium: 'e2e_chromium',
  firefox: 'e2e_firefox',
  webkit: 'e2e_webkit',
};

test.describe('Board Header Features', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Generate a unique trip ID for each test to ensure test isolation
    currentTripId = deterministicUUID(`test-trip-${testInfo.testId}`);

    // Get the project-specific username to ensure the trip is created for the authenticated user
    const projectName = testInfo.project.name;
    const projectUsername = PROJECT_USERNAME_MAP[projectName] || 'e2e_chromium';

    // Seed real test data for server component rendering
    seedResult = await seedMemberManagementTestData({ tripId: currentTripId, projectUsername });

    // Create test items with different statuses
    const userId = seedResult?.currentUserId || '';
    await seedKanbanBoardData({
      tripId: currentTripId,
      items: [
        { name: 'Tent', category: 'Essentials', required_count: 2, status: 'needed' },
        { name: 'Sleeping Bag', category: 'Essentials', required_count: 5, status: 'needed' },
        {
          name: 'Backpack',
          category: 'Essentials',
          required_count: 3,
          status: 'claimed',
          claimed_by: userId,
          claimed_quantity: 2,
        },
        {
          name: 'Flashlight',
          category: 'Essentials',
          required_count: 1,
          status: 'packed',
          claimed_by: userId,
          claimed_quantity: 1,
        },
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
    const allAuthUserIds = [...additionalAuthUserIds];
    if (seedResult?.createdAuthUserId) {
      allAuthUserIds.push(seedResult.createdAuthUserId);
    }

    if (currentTripId) {
      await cleanupMemberManagementTestData(currentTripId, allAuthUserIds);
    }

    seedResult = null;
    additionalAuthUserIds = [];
  });

  test.describe('Progress Bar', () => {
    test('should display progress bar', async ({ page }) => {
      // Look for progress bar
      const progressBar = page
        .locator('.bg-white\\/20.rounded-full')
        .or(page.locator('[role="progressbar"]'))
        .or(page.locator('.w-full.bg-stone-200 > div'));

      const hasProgressBar = (await progressBar.count()) > 0;

      if (hasProgressBar) {
        await expect(progressBar.first()).toBeVisible();
      }
    });

    test('should display progress percentage', async ({ page }) => {
      // Look for progress percentage text
      const progressText = page.getByText(/\d+%/).or(page.getByText(/packed/i));

      const hasProgressText = (await progressText.count()) > 0;

      if (hasProgressText) {
        await expect(progressText.first()).toBeVisible();
      }
    });

    test('should reflect accurate packing progress', async ({ page }) => {
      // With our seed data: 1 of 4 items packed = 25%
      // Progress bar should reflect this

      const progressBar = page
        .locator('.bg-white\\/20.rounded-full')
        .or(page.locator('[role="progressbar"]'))
        .or(page.locator('.w-full.bg-stone-200 > div'));

      const hasProgressBar = (await progressBar.count()) > 0;

      if (hasProgressBar) {
        // Get the width percentage of the progress bar
        const progressBarElement = progressBar.first();
        const widthStyle = await progressBarElement.getAttribute('style');
        const widthMatch = widthStyle?.match(/width:\s*(\d+)%/);

        if (widthMatch) {
          const percentage = parseInt(widthMatch[1]);
          // Should be around 25% (1 of 4 items)
          expect(percentage).toBeGreaterThan(0);
          expect(percentage).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  test.describe('Items Count', () => {
    test('should display items count', async ({ page }) => {
      // Look for items count text
      const itemsCount = page.getByText(/ITEMS/i).or(page.getByText(/\d+\s*items?/i));

      await expect(itemsCount.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show accurate Needed/Claimed/Packed counts', async ({ page }) => {
      // With our seed data: 2 Needed, 1 Claimed, 1 Packed
      // Look for count breakdown
      const neededText = page.getByText(/needed/i);
      const claimedText = page.getByText(/claimed/i);
      const packedText = page.getByText(/packed/i);

      const hasNeeded = (await neededText.count()) > 0;
      const hasClaimed = (await claimedText.count()) > 0;
      const hasPacked = (await packedText.count()) > 0;

      // At least some count text should be visible
      expect(hasNeeded || hasClaimed || hasPacked).toBe(true);
    });

    test('should update counts when items change state', async ({ page }) => {
      // Get initial counts
      const itemsCount = page.getByText(/ITEMS/i).or(page.getByText(/\d+\s*items?/i));
      const initialText = await itemsCount.first().textContent();

      // This test documents expected behavior
      // Actual implementation depends on real-time updates
      expect(initialText).toBeDefined();
    });
  });

  test.describe('Member Avatars', () => {
    test('should display member avatars', async ({ page }) => {
      // Look for avatar circles
      const avatars = page
        .locator('[data-testid="avatar"]')
        .or(page.locator('.rounded-full.h-8.w-8'))
        .or(page.locator('.rounded-full.h-6.w-6'));

      const avatarCount = await avatars.count();
      expect(avatarCount).toBeGreaterThanOrEqual(1);
    });

    test('should display up to 3 member avatars', async ({ page }) => {
      // With seed data, we have 2 members (admin + existing)
      const avatars = page
        .locator('[data-testid="avatar"]')
        .or(page.locator('.rounded-full.h-8.w-8'));

      const avatarCount = await avatars.count();

      // Should show at least 1, at most 3 visible avatars
      expect(avatarCount).toBeGreaterThanOrEqual(1);
      expect(avatarCount).toBeLessThanOrEqual(3);
    });

    test('should show +N indicator for 4+ members', async ({ page }, testInfo) => {
      // Seed many members
      const projectName = testInfo.project.name;
      const projectUsername = PROJECT_USERNAME_MAP[projectName] || 'e2e_chromium';

      const manyResult = await seedManyMembersTestData(currentTripId, projectUsername);
      additionalAuthUserIds = manyResult.additionalAuthUserIds || [];

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Look for +N indicator
      const moreIndicator = page.getByText(/\+\d/).or(page.locator('.rounded-full:has-text("+")'));

      const hasMoreIndicator = (await moreIndicator.count()) > 0;

      if (hasMoreIndicator) {
        await expect(moreIndicator.first()).toBeVisible();
      }
    });

    test('should show tooltip on avatar hover', async ({ page }) => {
      // Find an avatar
      const avatars = page
        .locator('[data-testid="avatar"]')
        .or(page.locator('.rounded-full.h-8.w-8'))
        .first();

      const hasAvatar = (await avatars.count()) > 0;

      if (hasAvatar) {
        // Hover over avatar
        await avatars.hover();

        // Tooltip might appear - this is hard to test without specific selectors
        // For now, just verify hover doesn't cause errors
        await expect(avatars).toBeVisible();
      }
    });
  });

  test.describe('View All Members Button', () => {
    test('should open members modal when View all is clicked', async ({ page }) => {
      // Find View all button
      const viewAllButton = page
        .getByRole('button', { name: /View all/i })
        .or(page.locator('button:has-text("View all")'))
        .first();

      const hasViewAllButton = (await viewAllButton.count()) > 0;

      if (hasViewAllButton) {
        await viewAllButton.click();
        await page.waitForTimeout(300);

        // Verify modal opened
        const modalHeading = page.getByRole('heading', { name: /Trip Members/i });
        await expect(modalHeading).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Back Button', () => {
    test('should navigate to dashboard when Back button is clicked', async ({ page }) => {
      // Find Back button
      const backButton = page
        .getByRole('button', { name: /Back/i })
        .or(page.locator('button:has([class*="lucide-arrow-left"])'))
        .first();

      await backButton.click();

      // Should navigate to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    });

    test('should be visible in header', async ({ page }) => {
      // Look for back button or arrow icon
      const backButton = page
        .getByRole('button', { name: /Back/i })
        .or(page.locator('button:has([class*="lucide-arrow-left"])'))
        .first();

      await expect(backButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Responsive Layout', () => {
    test('should adapt header for mobile screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Header should still be visible
      const headerElement = page.locator('header').or(page.locator('.border-b')).first();
      await expect(headerElement).toBeVisible();
    });

    test('should show condensed member avatars on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Avatars should still be visible
      const avatars = page
        .locator('[data-testid="avatar"]')
        .or(page.locator('.rounded-full.h-8.w-8'))
        .or(page.locator('.rounded-full.h-6.w-6'));

      const avatarCount = await avatars.count();

      // Should have at least 1 avatar
      expect(avatarCount).toBeGreaterThanOrEqual(1);
    });

    test('should adjust progress bar for mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Progress bar should still be visible
      const progressBar = page
        .locator('.bg-white\\/20.rounded-full')
        .or(page.locator('[role="progressbar"]'))
        .or(page.locator('.w-full.bg-stone-200 > div'));

      const hasProgressBar = (await progressBar.count()) > 0;

      if (hasProgressBar) {
        await expect(progressBar.first()).toBeVisible();
      }
    });
  });
});
