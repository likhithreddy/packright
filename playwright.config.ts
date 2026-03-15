import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.test (preferred) or .env.local (fallback)
const testEnvPath = path.resolve(__dirname, '.env.test');
const localEnvPath = path.resolve(__dirname, '.env.local');
const envFile = fs.existsSync(testEnvPath) ? testEnvPath : localEnvPath;

if (fs.existsSync(envFile)) {
  console.log(`[Playwright] Loading environment variables from ${path.basename(envFile)}`);
  dotenv.config({ path: envFile });
} else {
  console.warn('[Playwright] No .env.test or .env.local file found. Tests may fail.');
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { outputFolder: 'test-report/e2e', open: 'never' }], ['list']],
  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Timeout for each assertion in expect() */
  expect: {
    timeout: process.env.CI ? 10000 : 5000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user-chromium.json',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false, // Always start fresh to use ephemeral credentials
    timeout: 120 * 1000,
    env: {
      // Filter out undefined values to satisfy TypeScript's string requirement
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL && {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      }),
      ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && {
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }),
      ...(process.env.SUPABASE_SERVICE_ROLE_KEY && {
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      }),
      ...(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY && {
        NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
      }),
    },
  },
});
