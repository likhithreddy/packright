import { test as base, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const test = base.extend({
  storageState: async ({}, use, testInfo) => {
    await use(
      path.join(process.cwd(), `playwright/.auth/onboarding-${testInfo.project.name}.json`)
    );
  },
});

// We no longer use a single storageState at the file level.
// Instead, playwright.config.ts assigns separate storageStates per project
// (chromium, firefox, webkit) to ensure full horizontal isolation.

test.describe.serial('Onboarding Flow', () => {
  // Reset the specific e2e user's profile before each test.
  // This ensures that even within one browser runner's serial execution,
  // each test starts with a clean slate (no username).
  test.beforeEach(async ({}, testInfo) => {
    // 1. Load dynamic environment from the shared stack-env.json
    const authDir = path.join(process.cwd(), 'playwright/.auth');
    const envPath = path.join(authDir, 'stack-env.json');
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (fs.existsSync(envPath)) {
      try {
        const env = JSON.parse(fs.readFileSync(envPath, 'utf-8'));
        supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
        serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
      } catch (err) {
        console.error('[E2E Worker] Failed to read stack-env.json:', err);
      }
    }

    // Fallback to defaults if still missing
    supabaseUrl = supabaseUrl ?? 'http://127.0.0.1:54321';
    serviceRoleKey = serviceRoleKey ?? '';

    // Each project has its own unique user: e2e-onboarding-chromium, e2e-onboarding-firefox, etc.
    const project = testInfo.project.name;
    const testEmail = `e2e-onboarding-${project}@packright.test`;

    if (!serviceRoleKey) return;

    // 1. Find the specific e2e user for this browser project
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!listRes.ok) return;
    const { users } = (await listRes.json()) as {
      users?: { id: string; email?: string }[];
    };
    const e2eUser = users?.find((u) => u.email === testEmail);
    if (!e2eUser) return;

    // 2. Reset the profile to null-username state
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(e2eUser.id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        username: null,
        avatar_theme: null,
        packing_style: null,
      }),
    });
  });

  test('redirects users without username to onboarding page', async ({ page }) => {
    // Navigate to dashboard — since the profile was reset in beforeEach,
    // the server-side DashboardLayout should see username=null and redirect.
    await page.goto('/dashboard');

    // Assert redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.locator('h1')).toContainText('Almost there!');
  });

  test('allows completing onboarding and then entering dashboard', async ({
    page,
    browserName,
  }) => {
    // Use a unique username to avoid any potential collision within the same DB
    const uniqueUsername = `user_${Math.random().toString(36).slice(2, 8)}`;

    // Mock ONLY the client-side availability check.
    // Profile writes (PATCH) and reads (SSR) hit the real Supabase.
    await page.route('**/rest/v1/rpc/check_username_available', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(true),
      });
    });

    // Log browser console messages
    page.on('console', (msg) =>
      console.log(`[browser:${browserName}] ${msg.type()}: ${msg.text()}`)
    );
    page.on('pageerror', (err) => console.error(`[browser:${browserName}] ERROR: ${err.message}`));
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/auth/v1/') || url.includes('/rest/v1/')) {
        const status = response.status();
        const method = response.request().method();
        console.log(`[browser:${browserName}] ${method} ${url} -> ${status}`);
        if (status >= 400) {
          try {
            const body = await response.json();
            console.log(`[browser:${browserName}] ERROR BODY: ${JSON.stringify(body)}`);
          } catch {
            console.log(`[browser:${browserName}] ERROR BODY: (not JSON)`);
          }
        }
      }
    });

    await page.goto('/onboarding');

    // ── Step 1: Identity ──────────────────────────────────────────────────────
    await page.fill('input[name="full_name"]', 'E2E Test User');
    await page.type('input[name="username"]', uniqueUsername, { delay: 50 });

    // Wait for the availability check icon
    await page.waitForSelector('[data-testid="user-check-icon"]', { timeout: 10000 });

    // Click Next -> Shows "Confirm your handle"
    // We explicitly wait for the button to be enabled to avoid WebKit race conditions
    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: "Yes, I'm sure" }).click();

    // ── Step 2: Avatar Color ──────────────────────────────────────────────────
    await page.click('button[aria-label="Select Deep Gold avatar color"]');
    await page.click('button:has-text("Next")');

    // ── Step 3: Packing Style ─────────────────────────────────────────────────
    await page.click('button:has-text("Light Packer")');
    await page.click('button:has-text("Complete Setup")');

    // ── Assert redirect to dashboard ──────────────────────────────────────────
    // The redirect is driven by the server-side layout detecting the new username
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('h1').first()).toContainText('My Trips');
  });
});
