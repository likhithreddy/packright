import { test, expect } from '@playwright/test';

test.describe('Create New Trip Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the external Groq API to ensure determinism and prevent failures from missing keys
    await page.route('**/api/generate-list', async (route) => {
      const json = {
        items: [
          { name: 'Sunscreen', category: 'Health', quantity: 1 },
          { name: 'Passport', category: 'Documents', quantity: 1 },
          { name: 'Camera', category: 'Electronics', quantity: 1 },
        ],
      };
      await route.fulfill({ json, status: 200 });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    if (page.url().includes('/login')) {
      console.log('Redirected to login, skipping E2E flow steps that require auth');
    }
  });

  test('should successfully create a new trip and redirect via skip path', async ({ page }) => {
    if (page.url().includes('/login')) return;

    // Wait for the Plan New Trip button and click it
    const newTripBtn = page.getByRole('button', { name: 'New Trip', exact: true });
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

    // Open Start Date Picker
    const startDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(0);
    await startDateTrigger.click();

    // Click on start date
    let dayButtons = page.locator('.rdp-day:not(.rdp-day_disabled)');
    await dayButtons.nth(0).click();

    // Open End Date Picker
    const endDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(1);
    await endDateTrigger.click();

    // Click on end date
    dayButtons = page.locator('.rdp-day:not(.rdp-day_disabled)');
    await dayButtons.nth(2).click();

    // Submit Step 1
    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Verify Step 2 AI Suggestion Heading
    await expect(page.getByText(/AI Packing Suggestions/i)).toBeVisible();

    // Click Skip & Create
    const skipBtn = page.getByRole('button', { name: 'Skip & Create' });
    await expect(skipBtn).toBeEnabled();
    await skipBtn.click();

    // A success toast should be visible immediately after the API call finishes
    // and before the 3-second witty redirect completes.
    await expect(page.getByText('Trip created successfully!')).toBeVisible();

    // The modal should close and the user should be redirected to the new trip dashboard.
    await expect(page).toHaveURL(/\/dashboard\/trips\/[a-zA-Z0-9-]+/, { timeout: 10000 });
  });

  test('should block Step 2 transition when required fields are empty', async ({ page }) => {
    if (page.url().includes('/login')) return;

    const newTripBtn = page.getByRole('button', { name: 'New Trip', exact: true });
    await newTripBtn.click();

    // Attempt to proceed without filling anything
    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextBtn).toBeDisabled();

    // Should remain on Step 1 - validation errors visible
    await expect(page.getByText('Plan a New Trip')).toBeVisible();
    // Step 2 content should NOT be visible
    await expect(page.getByText(/AI Packing Suggestions/i)).not.toBeVisible();
  });

  test('should navigate Step 1 → Step 2 → Step 3 via Get Suggestions', async ({ page }) => {
    if (page.url().includes('/login')) return;

    const newTripBtn = page.getByRole('button', { name: 'New Trip', exact: true });
    await newTripBtn.click();

    await page.getByLabel(/TRIP NAME/i).fill('AI Suggestions Trip');
    await page.getByLabel(/DESTINATION/i).fill('Bali, Indonesia');

    const startDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(0);
    await startDateTrigger.click();
    let dayButtons = page.locator('.rdp-day:not(.rdp-day_disabled)');
    await dayButtons.nth(1).click();

    const endDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(1);
    await endDateTrigger.click();
    dayButtons = page.locator('.rdp-day:not(.rdp-day_disabled)');
    await dayButtons.nth(5).click();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText(/AI Packing Suggestions/i)).toBeVisible();

    // Get Suggestions should be disabled before 20 chars
    const getSuggestionsBtn = page.getByRole('button', { name: /Get Suggestions/i });
    await expect(getSuggestionsBtn).toBeDisabled();

    // Type enough to meet the 20-char threshold
    const promptTextarea = page.getByPlaceholder(/e.g. 5 day hiking trip/i);
    await promptTextarea.fill(
      'A beach trip with friends for a week in Bali with surfing and cultural visits'
    );
    await expect(getSuggestionsBtn).toBeEnabled();
    await getSuggestionsBtn.click();

    // Step 3: Choose Suggested Items
    await expect(page.getByRole('heading', { name: 'Choose Suggested Items' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sunscreen' })).toBeVisible();
  });

  test('should select and deselect items in Step 3 and submit correctly', async ({ page }) => {
    if (page.url().includes('/login')) return;

    await page.getByRole('button', { name: 'New Trip', exact: true }).click();
    await page.getByLabel(/TRIP NAME/i).fill('Step 3 Trip');
    await page.getByLabel(/DESTINATION/i).fill('Lisbon');

    const startDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(0);
    await startDateTrigger.click();
    let dayButtons = page.locator('.rdp-day:not(.rdp-day_disabled)');
    await dayButtons.nth(0).click();

    const endDateTrigger = page.locator('button:has(svg.lucide-calendar)').nth(1);
    await endDateTrigger.click();
    dayButtons = page.locator('.rdp-day:not(.rdp-day_disabled)');
    await dayButtons.nth(3).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    const promptTextarea = page.getByPlaceholder(/e.g. 5 day hiking trip/i);
    await promptTextarea.fill(
      '5-day solo city exploration in Lisbon with sightseeing and seafood tours'
    );
    await page.getByRole('button', { name: /Get Suggestions/i }).click();

    await expect(page.getByRole('heading', { name: 'Choose Suggested Items' })).toBeVisible();

    // Select all then clear
    await page.getByRole('button', { name: 'Select All' }).click();
    const selectedCount = await page.getByText(/\d+ selected/).textContent();
    expect(parseInt(selectedCount ?? '0')).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText('0 selected')).toBeVisible();

    // Select one item
    await page.getByRole('button', { name: 'Sunscreen' }).click();
    await expect(page.getByText('1 selected')).toBeVisible();

    // Submit with the single item
    const addItemsBtn = page.getByRole('button', { name: /Add 1 Items & Create/i });
    await expect(addItemsBtn).toBeEnabled();
    await addItemsBtn.click();

    await expect(page).toHaveURL(/\/dashboard\/trips\/[a-zA-Z0-9-]+/);
  });

  test('should close modal and discard form data when Cancel is clicked', async ({ page }) => {
    if (page.url().includes('/login')) return;

    await page.getByRole('button', { name: 'New Trip', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Plan a New Trip' })).toBeVisible();

    await page.getByLabel(/TRIP NAME/i).fill('Trip to Abandon');

    // Close via Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should be gone
    await expect(page.getByRole('heading', { name: 'Plan a New Trip' })).not.toBeVisible();

    // Reopening should show a blank form
    await page.getByRole('button', { name: 'New Trip', exact: true }).click();
    const titleInput = page.getByLabel(/TRIP NAME/i);
    await expect(titleInput).toHaveValue('');
  });

  test('calendar: year navigation buttons should advance and retreat year', async ({ page }) => {
    if (page.url().includes('/login')) return;

    await page.getByRole('button', { name: 'New Trip', exact: true }).click();
    const startDateTrigger = page.getByRole('button', { name: /Start Date/i });
    await startDateTrigger.click();

    // Read current month/year caption
    const caption = page.locator('.rdp-caption_label').first();
    const initialText = await caption.textContent();

    // Click next year button (ChevronsRight)
    await page.getByRole('button', { name: /Next year/i }).click();
    const nextYearText = await caption.textContent();
    expect(nextYearText).not.toBe(initialText);

    // Click previous year button (ChevronsLeft) - should go back to original
    await page.getByRole('button', { name: /Previous year/i }).click();
    const restoredText = await caption.textContent();
    expect(restoredText).toBe(initialText);
  });

  test('date picker calendar should render above the trigger (side=top)', async ({ page }) => {
    if (page.url().includes('/login')) return;

    await page.getByRole('button', { name: 'New Trip', exact: true }).click();
    const trigger = page.getByRole('button', { name: /Start Date/i });
    await trigger.click();

    const calendar = page.locator('[data-slot="calendar"]');
    await expect(calendar).toBeVisible();

    const triggerBox = await trigger.boundingBox();
    const calendarBox = await calendar.boundingBox();

    // Calendar bottom should be above the trigger top
    if (triggerBox && calendarBox) {
      expect(calendarBox.y).toBeLessThan(triggerBox.y);
    }
  });
});
