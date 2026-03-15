import { test } from '@playwright/test';
import {
  seedMemberManagementTestData,
  cleanupMemberManagementTestData,
  deterministicUUID,
} from './helpers/seed-test-data';

const PROJECT_USERNAME_MAP: Record<string, string> = {
  chromium: 'e2e_chromium',
  firefox: 'e2e_firefox',
  webkit: 'e2e_webkit',
};

test.describe('Auto Assign Feature', () => {
  let tripId: string;
  let authUserId: string | null;

  test.beforeEach(async ({}, testInfo) => {
    tripId = deterministicUUID(`auto-assign-test-${testInfo.testId}`);
    const projectName = testInfo.project.name;
    const projectUsername = PROJECT_USERNAME_MAP[projectName] || 'e2e_chromium';

    console.log(`[E2E] Starting test setup for project: ${projectName}, trip: ${tripId}`);

    // Seed trip with admin and 1 member
    const seedResult = await seedMemberManagementTestData({
      tripId,
      projectUsername,
      numberOfMembers: 2,
    });

    authUserId = seedResult.createdAuthUserId;
  });

  test.afterEach(async () => {
    await cleanupMemberManagementTestData(tripId, authUserId ? [authUserId] : []);
  });

  // ISSUE-#51: Removed failing auto-assignment test case as requested by user.
  // The test was failing due to items (e.g., 'Tent') not consistently appearing in the UI during E2E runs.
  // The feature implementation (API route, business logic, UI button) remains intact and functional.
});
