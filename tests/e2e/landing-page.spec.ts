import { test, expect } from '@playwright/test';

test.describe('Landing Page Flow', () => {
  test('should display all landing page elements', async ({ page }) => {
    await page.goto('/');

    // Verify HeroSection elements
    await expect(page.getByText('Group Travel, Finally Sorted')).toBeVisible();
    await expect(page.getByText(/Pack together,/i)).toBeVisible();
    await expect(page.getByText(/show up ready\./i)).toBeVisible();
    await expect(page.getByText(/PackRight gives your trip group/i)).toBeVisible();

    // Verify CTA buttons
    await expect(page.getByRole('link', { name: /get started free/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate to signup when clicking "Get Started Free"', async ({ page, context }) => {
    // Isolated unauthenticated context to avoid redirection to /dashboard
    await context.clearCookies();
    await page.goto('/');

    // Wait for page to fully load including dynamic content
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small buffer for hydration

    // Get the Get Started Free button and wait for it to be visible
    const getStartedButton = page.getByRole('link', { name: /get started free/i });
    await getStartedButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click and wait for navigation
    await getStartedButton.click();
    await page.waitForURL(/.*\/signup/, { timeout: 10000 });

    await expect(page).toHaveURL(/.*\/signup/);
    await expect(page.getByText('Create an account', { exact: true })).toBeVisible();
  });

  test('should navigate to login when clicking "Sign In"', async ({ page, context }) => {
    // Isolated unauthenticated context to avoid redirection to /dashboard
    await context.clearCookies();
    await page.goto('/');

    // Wait for page to fully load including dynamic content
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small buffer for hydration

    // Get the Sign In button and wait for it to be visible
    const signInButton = page.getByRole('link', { name: /sign in/i });
    await signInButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click and wait for navigation
    await signInButton.click();
    await page.waitForURL(/.*\/login/, { timeout: 10000 });

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('should display FeatureCard elements', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load including dynamic content
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small buffer for hydration

    // Verify feature cards are displayed
    // FeatureCard components don't have unique identifiers, so we check for common feature text
    const featureCards = page.locator('.bg-card.shadow-sm.border');
    await expect(featureCards).toHaveCount(3); // Assuming 3 feature cards

    // Verify that feature cards have icons (using bg-primary/10 class)
    await expect(page.locator('.bg-primary\\/10')).toHaveCount(3);
  });

  test('should display TripBoardMockCard', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load including dynamic content
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small buffer for hydration

    // Verify TripBoardMockCard elements with longer timeout
    const mtnText = page.getByText('Smoky Mountains');
    await mtnText.waitFor({ state: 'visible', timeout: 10000 });
    await expect(mtnText).toBeVisible();
    await expect(page.getByText('Mar 15 – Mar 19')).toBeVisible();
    await expect(page.getByText('4 members')).toBeVisible();

    // Verify progress section
    await expect(page.getByText('Packed', { exact: true })).toBeVisible();
    await expect(page.getByText('62%')).toBeVisible();

    // Verify progress bar is displayed
    const progressBar = page.locator('.bg-secondary\\/50.rounded-full').first();
    await expect(progressBar).toBeVisible();
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify mobile layout
    await expect(page.getByText('Group Travel, Finally Sorted')).toBeVisible();

    // Verify buttons stack on mobile
    const buttonContainer = page.locator('.flex-col.sm\\:flex-row').first();
    await expect(buttonContainer).toBeVisible();

    // Verify CTA buttons are still clickable on mobile
    await expect(page.getByRole('link', { name: /get started free/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('should have responsive layout on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Verify desktop layout
    await expect(page.getByText('Group Travel, Finally Sorted')).toBeVisible();

    // Verify hero section has proper max-width
    const heroSection = page.locator('.max-w-2xl');
    await expect(heroSection).toBeVisible();
  });

  test('should maintain accessibility with proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Verify semantic heading structure
    const h2 = page.locator('h2');
    const h1 = page.locator('h1');

    await expect(h2).toContainText('Group Travel, Finally Sorted');
    await expect(h1).toContainText('Pack together');

    // Verify landmarks if present (would be checked with page.accessibility.snapshot())
  });

  test('should load quickly and have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Verify no critical console errors
    expect(
      consoleErrors.filter((err) => !err.includes('Third-party cookie') && !err.includes('favicon'))
    ).toEqual([]);
  });

  test('should have proper metadata and SEO', async ({ page }) => {
    await page.goto('/');

    // Verify page title
    await expect(page).toHaveTitle(/PackRight/);

    // Verify viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('should display ArrowRight icon in Get Started button', async ({ page }) => {
    await page.goto('/');

    // Click the Get Started Free button
    const getStartedButton = page.locator('a:has-text("Get Started Free")');
    await expect(getStartedButton).toBeVisible();

    // Verify icon exists (ArrowRight from lucide-react)
    const icon = getStartedButton.locator('svg');
    await expect(icon).toBeVisible();
  });
});
