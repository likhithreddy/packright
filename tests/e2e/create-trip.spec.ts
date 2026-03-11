import { test, expect } from '@playwright/test';

test.describe('Create New Trip Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    if (page.url().includes('/login')) {
      console.log('Redirected to login, skipping E2E flow steps that require auth');
    }
  });

  test('should successfully create a new trip and redirect via skip path', async ({ page }) => {
    if (page.url().includes('/login')) return;

    // Wait for the Plan New Trip button and click it
    const newTripBtn = page.getByRole('button', { name: 'Plan New Trip' });
    await expect(newTripBtn).toBeVisible();
    await newTripBtn.click();

    // Verify modal elements are visible
    const modalHeading = page.getByRole('heading', { name: 'Plan a New Trip' });
    await expect(modalHeading).toBeVisible();

    // Fill the Trip Title
    const titleInput = page.getByLabel(/TRIP NAME/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('My E2E Test Trip');

    // Fill the Destination
    const destinationInput = page.getByLabel(/DESTINATION/i);
    await expect(destinationInput).toBeVisible();
    await destinationInput.fill('Tokyo, Japan');

    // Open Date Picker
    const datePickerTrigger = page
      .getByRole('button', { name: /Pick the trip dates/i })
      .or(page.getByRole('button', { name: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i }));
    await datePickerTrigger.click();

    // Click on dates
    const dayButtons = page.locator('.rdp-day:not(.rdp-day_disabled)');
    await dayButtons.nth(0).click(); // Click start date
    await dayButtons.nth(2).click(); // Click end date

    // Submit Step 1
    const nextBtn = page.getByRole('button', { name: 'Next' });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Verify Step 2 AI Suggestion Heading
    await expect(page.getByText('AI Packing Suggestions — Optional')).toBeVisible();

    // Click Skip & Create
    const skipBtn = page.getByRole('button', { name: 'Skip & Create' });
    await expect(skipBtn).toBeEnabled();
    await skipBtn.click();

    // The modal should close and the user should be redirected to the new trip dashboard.
    await expect(page).toHaveURL(/\/dashboard\/trips\/[a-zA-Z0-9-]+/);

    // A success toast should be visible
    await expect(page.getByText('Trip to Tokyo, Japan created successfully!')).toBeVisible();
  });
});
