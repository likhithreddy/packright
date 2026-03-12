import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

declare global {
  var __SUPABASE_STACK_STOP__: (() => Promise<void>) | undefined;
}

/**
 * Global setup for E2E tests.
 *
 * This script creates and initializes 3 distinct E2E test users (one per browser
 * project) to ensure full database isolation during parallel test runs.
 * Each user is reset to a null-username state via the Supabase Service Role API.
 */
async function globalSetup(config: FullConfig) {
  // 1. Validate that the ephemeral Supabase stack is accessible
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[globalSetup] SUPABASE_URL or SERVICE_ROLE_KEY is missing. ' +
      'Did you run this using the run-with-stack wrapper?'
    );
  }

  console.log(`[globalSetup] Using Supabase Stack: ${supabaseUrl}`);

  const projects = ['chromium', 'firefox', 'webkit'];
  const authDir = path.join(process.cwd(), 'playwright/.auth');

  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // 3. Save dynamic environment for test workers (since process.env doesn't always propagate)
  const envData = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
  fs.writeFileSync(path.join(authDir, 'stack-env.json'), JSON.stringify(envData, null, 2));
  console.log(`[globalSetup] Stack environment saved to ${path.join(authDir, 'stack-env.json')}`);

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
          const listRes = await fetch(`${authAdminUrl}?page=1&per_page=1000`, {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          });

          if (listRes.ok) {
            const { users } = (await listRes.json()) as {
              users?: { id: string; email?: string }[];
            };
            let user = users?.find((u) => u.email === testEmail);

            if (!user) {
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
              user = await createRes.json();
            }

            if (user && user.id) {
              // 2. Reset Profile via PATCH (set username to null)
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
              console.log(
                `[globalSetup:${project}] Profile reset status: ${profilePatchRes.status}`
              );
            }
          }
        } catch (adminErr) {
          console.error(`[globalSetup:${project}] Admin setup failed:`, adminErr);
        }
      }

      // 3. Sign in and capture storage state
      const browserInstance = await chromium.launch({
        args: ['--disable-web-security'],
      });
      const page = await browserInstance.newPage();

      // Log console messages from the browser
      page.on('console', (msg) => {
        console.log(
          `[globalSetup:browser:${project}:${testUser.type}] ${msg.type().toUpperCase()}: ${msg.text()}`
        );
      });
      page.on('pageerror', (err) => {
        console.error(`[globalSetup:browser:${project}:${testUser.type}] ERROR: ${err.message}`);
      });
      page.on('response', async (response) => {
        if (response.url().includes('/auth/v1/token') && !response.ok()) {
          try {
            const body = await response.json();
            console.error(
              `[globalSetup:browser:${project}:${testUser.type}] AUTH FAIL: ${response.status()} ${JSON.stringify(body)}`
            );
          } catch { }
        }
      });

      try {
        console.log(
          `[globalSetup:${project}:${testUser.type}] Waiting for local server at ${baseURL}...`
        );

        // Retry loop for server readiness
        let ready = false;
        for (let i = 0; i < 60; i++) {
          try {
            const res = await fetch(`${baseURL}/api/diag`);
            if (res.ok) {
              const data = await res.json();
              console.log(`[globalSetup:${project}:${testUser.type}] Server ready. Diag:`, data);
              ready = true;
              break;
            }
          } catch { }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (!ready) {
          throw new Error(`Server at ${baseURL} not ready after 20s`);
        }

        await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
        console.log(`[globalSetup:${project}:${testUser.type}] Filling login form...`);
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', testPassword);

        // Wait for redirect depending on user setup
        const targetUrl = testUser.type === 'onboarding' ? /\/onboarding/ : /\/dashboard/;
        console.log(
          `[globalSetup:${project}:${testUser.type}] Submitting login, waiting for redirect to ${targetUrl}...`
        );

        await page.click('button[type="submit"]');

        try {
          await page.waitForURL(targetUrl, { timeout: 45000, waitUntil: 'networkidle' });
        } catch (waitErr) {
          console.error(
            `[globalSetup:${project}:${testUser.type}] Redirect to ${targetUrl} failed or timed out.`
          );
          throw waitErr;
        }

        await page.context().storageState({ path: authPath });
        console.log(`[globalSetup:${project}:${testUser.type}] Auth state saved to ${authPath}`);
      } catch (err) {
        console.error(`[globalSetup:${project}:${testUser.type}] Auth capture failed:`, err);
        const failScreenshot = path.join(authDir, `fail-${project}-${testUser.type}.png`);
        try {
          await page.screenshot({ path: failScreenshot });
          console.log(
            `[globalSetup:${project}:${testUser.type}] Failure screenshot saved to ${failScreenshot}`
          );
        } catch (sErr) {
          console.error(`[globalSetup:${project}:${testUser.type}] Screenshot failed:`, sErr);
        }
        console.log(`[globalSetup:${project}:${testUser.type}] URL at failure: ${page.url()}`);
        // Log page content summary on failure
        const content = await page.textContent('body');
        console.log(
          `[globalSetup:${project}:${testUser.type}] Page content snippet: ${content?.slice(0, 100)}...`
        );
      } finally {
        await browserInstance.close();
      }
    }
  }
}

export default globalSetup;
