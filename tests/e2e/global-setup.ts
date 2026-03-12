import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { startSupabaseStack } from './infra/supabase-stack';

declare global {
  var __SUPABASE_STACK_STOP__: (() => Promise<void>) | undefined;
}

/**
 * Global setup for E2E tests.
 *
 * This script creates and initializes 3 distinct E2E test users (one per browser
 * project) to ensure full database isolation during parallel test runs.
 */
async function globalSetup(config: FullConfig) {
  // 1. Start ephemeral Supabase stack
  const stack = await startSupabaseStack();

  // 2. Inject environment variables for the entire test session
  process.env.NEXT_PUBLIC_SUPABASE_URL = stack.supabaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = stack.anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = stack.serviceRoleKey;
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = stack.serviceRoleKey;

  // Store the stop function globally for teardown
  global.__SUPABASE_STACK_STOP__ = stack.stop;

  const supabaseUrl = stack.supabaseUrl;
  const serviceRoleKey = stack.serviceRoleKey;

  const projects = ['chromium', 'firefox', 'webkit'];
  const authDir = path.join(process.cwd(), 'playwright/.auth');

  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Use the first project's baseURL which is standard localhost:3000
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  // --- Warmup: Wait for dev server to be ready ---
  console.log(`[globalSetup] Waiting for server at ${baseURL}...`);
  let attempts = 0;
  while (attempts < 30) {
    try {
      const res = await fetch(baseURL);
      if (res.ok) break;
    } catch {
      // ignore
    }
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  for (const project of projects) {
    const testUsers = [
      {
        type: 'main',
        email: `e2e-${project}@packright.test`,
        authPath: path.join(authDir, `user-${project}.json`),
        profile: {
          username: `e2e_${project}`,
          full_name: `E2E ${project} User`,
          avatar_theme: 'emerald',
          packing_style: 'Light Packer',
        },
      },
      {
        type: 'onboarding',
        email: `e2e-onboarding-${project}@packright.test`,
        authPath: path.join(authDir, `onboarding-${project}.json`),
        profile: {
          username: null,
          full_name: `E2E Onboarding ${project}`,
          avatar_theme: null,
          packing_style: null,
        },
      },
    ];

    for (const testUser of testUsers) {
      const testEmail = testUser.email;
      const testPassword = 'Password123!';
      const authPath = testUser.authPath;

      console.log(`[globalSetup:${project}] Preparing user: ${testEmail}`);

      if (serviceRoleKey) {
        // 1. Create or fetch user via Admin API
        try {
          const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users`;

          // In an ephemeral stack, we know the user doesn't exist yet, but we'll follow the flow
          console.log(`[globalSetup:${project}] Creating new user...`);
          const createRes = await fetch(authAdminUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              email: testEmail,
              password: testPassword,
              email_confirm: true,
            }),
          });

          const user = await createRes.json();

          if (user && user.id) {
            // 2. Reset Profile via PATCH (set values)
            const profilePatchRes = await fetch(
              `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: serviceRoleKey,
                  Authorization: `Bearer ${serviceRoleKey}`,
                  Prefer: 'return=minimal',
                },
                body: JSON.stringify(testUser.profile),
              }
            );
            console.log(`[globalSetup:${project}] Profile setup status: ${profilePatchRes.status}`);
          }
        } catch (adminErr) {
          console.error(`[globalSetup:${project}] Admin setup failed:`, adminErr);
        }
      }

      // 3. Sign in and capture storage state
      const browserInstance = await chromium.launch();
      const page = await browserInstance.newPage();
      try {
        await page.goto(`${baseURL}/login`);
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', testPassword);
        await page.click('button[type="submit"]');

        // Wait for redirect depending on user setup
        const targetUrl = testUser.type === 'onboarding' ? /\/onboarding/ : /\/dashboard/;
        await page.waitForURL(targetUrl, { timeout: 20000 });
        await page.context().storageState({ path: authPath });
        console.log(`[globalSetup:${project}] Auth state saved to ${authPath}`);
      } catch (err) {
        console.error(`[globalSetup:${project}] Auth capture failed:`, err);
      } finally {
        await browserInstance.close();
      }
    }
  }
}

export default globalSetup;
