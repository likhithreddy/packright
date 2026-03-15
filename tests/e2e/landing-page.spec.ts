import { test, expect } from '@playwright/test';

test.describe('Landing Page Flow', () => {
  test('should display all landing page elements', async ({ page }) => {
    console.log('Navigating to landing page...');
    await page.goto('/');

    console.log('Checking HeroSection elements...');
    // Verify HeroSection elements
    await expect(page.getByText('Premium Group Travel')).toBeVisible();
    await expect(page.getByText(/Pack together,/i)).toBeVisible();
    await expect(page.getByText(/show up ready\./i)).toBeVisible();
    await expect(page.getByText(/The editorial packing board for groups who care/i)).toBeVisible();

    console.log('Checking CTA buttons...');
    // Verify CTA buttons
    await expect(page.getByRole('link', { name: /start packing free/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate to signup when clicking "Get Started Free"', async ({ page, context }) => {
    // Isolated unauthenticated context to avoid redirection to /dashboard
    await context.clearCookies();
    await page.goto('/');

    // Wait for page to fully load including dynamic content
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small buffer for hydration

    // Get the Start Packing Free button and wait for it to be visible
    const getStartedButton = page.getByRole('link', { name: /start packing free/i });
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
    // Using first() because cards exist for both desktop and mobile layouts
    await expect(page.getByText('AI Packing').first()).toBeVisible();
    await expect(page.getByText('Auto-Assign').first()).toBeVisible();
    await expect(page.getByText(/Live (Readiness|Status|Readiness)/).first()).toBeVisible();
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
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify mobile layout
    await expect(page.getByText('Premium Group Travel')).toBeVisible();

    // Verify CTA buttons are still clickable on mobile
    await expect(page.getByRole('link', { name: /start packing free/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('should have responsive layout on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Verify desktop layout
    await expect(page.getByText('Premium Group Travel')).toBeVisible();

    // Verify hero section has proper max-width on the description paragraph
    // In HeroSection.tsx, the paragraph has lg:max-w-xl
    const heroDesc = page.locator('p.max-w-xl, p.lg\\:max-w-xl');
    await expect(heroDesc.first()).toBeVisible();
  });

  test('should maintain accessibility with proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Verify semantic heading structure
    // HeroSection handles H1 and H2
    await expect(page.locator('h1')).toContainText('Pack together');
    await expect(page.locator('h2').first()).toContainText('Premium Group Travel');
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

  test('should display ArrowLeft/Right/UpRight icon in Start Packing button', async ({ page }) => {
    await page.goto('/');

    // Click the Start Packing Free button
    const getStartedButton = page.locator('a:has-text("Start Packing Free")');
    await expect(getStartedButton).toBeVisible();

    // Verify icon exists
    const icon = getStartedButton.locator('svg');
    await expect(icon).toBeVisible();
  });
});
