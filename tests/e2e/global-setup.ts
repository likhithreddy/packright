import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Global setup for E2E tests.
 *
 * This script creates and initializes 3 distinct E2E test users (one per browser
 * project) to ensure full database isolation during parallel test runs.
 * Each user is reset to a null-username state via the Supabase Service Role API.
 */
async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
    '';

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
    const testEmail = `e2e-${project}@packright.test`;
    const testPassword = 'Password123!';
    const authPath = path.join(authDir, `user-${project}.json`);

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
                body: JSON.stringify({
                  username: null,
                  full_name: `E2E ${project} User`,
                  avatar_theme: null,
                  packing_style: null,
                }),
              }
            );
            console.log(`[globalSetup:${project}] Profile reset status: ${profilePatchRes.status}`);
          }
        }
      } catch (adminErr) {
        console.error(`[globalSetup:${project}] Admin setup failed:`, adminErr);
      }
    }

    // 3. Sign in and capture storage state
    // We use Chromium to capture all auth states because it's most stable
    // for this one-time capture.
    const browserInstance = await chromium.launch();
    const page = await browserInstance.newPage();
    try {
      await page.goto(`${baseURL}/login`);
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');

      // Wait for redirect to onboarding
      await page.waitForURL(/\/onboarding/, { timeout: 20000 });
      await page.context().storageState({ path: authPath });
      console.log(`[globalSetup:${project}] Auth state saved to ${authPath}`);
    } catch (err) {
      console.error(`[globalSetup:${project}] Auth capture failed:`, err);
    } finally {
      await browserInstance.close();
    }
  }
}

export default globalSetup;
