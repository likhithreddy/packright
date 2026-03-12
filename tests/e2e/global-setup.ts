import { type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

declare global {
  var __SUPABASE_STACK_STOP__: (() => Promise<void>) | undefined;
}

/**
 * Encode a string as base64url (URL-safe base64, no padding).
 * This mirrors what @supabase/ssr does internally.
 */
function toBase64URL(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Split an encoded cookie value into chunks of MAX_CHUNK_SIZE (3180 chars),
 * matching the @supabase/ssr chunker logic exactly.
 */
const MAX_CHUNK_SIZE = 3180;
function createChunks(key: string, value: string): { name: string; value: string }[] {
  let encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }];
  }

  const chunks: string[] = [];
  while (encodedValue.length > 0) {
    let encodedChunkHead = encodedValue.slice(0, MAX_CHUNK_SIZE);
    const lastEscapePos = encodedChunkHead.lastIndexOf('%');
    if (lastEscapePos > MAX_CHUNK_SIZE - 3) {
      encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos);
    }
    let valueHead = '';
    while (encodedChunkHead.length > 0) {
      try {
        valueHead = decodeURIComponent(encodedChunkHead);
        break;
      } catch (error) {
        if (
          error instanceof URIError &&
          encodedChunkHead.at(-3) === '%' &&
          encodedChunkHead.length > 3
        ) {
          encodedChunkHead = encodedChunkHead.slice(0, encodedChunkHead.length - 3);
        } else {
          throw error;
        }
      }
    }
    chunks.push(valueHead);
    encodedValue = encodedValue.slice(encodedChunkHead.length);
  }
  return chunks.map((chunkValue, i) => ({ name: `${key}.${i}`, value: chunkValue }));
}

/**
 * Build a Playwright storageState JSON from a Supabase session token using
 * the exact @supabase/ssr cookie encoding (base64url, chunked).
 *
 * @param session   Raw session object returned from Supabase auth REST API
 * @param storageKey  The cookie/localStorage key (e.g. "sb-localhost-auth-token")
 * @param origin    The app origin (e.g. "http://localhost:3000")
 */
function buildStorageState(
  session: object,
  storageKey: string,
  origin: string
): { cookies: object[]; origins: object[] } {
  const sessionJson = JSON.stringify(session);

  // @supabase/ssr encodes as "base64-<base64url(value)>"
  const encoded = 'base64-' + toBase64URL(sessionJson);

  // Chunk the encoded value, matching @supabase/ssr chunker
  const chunks = createChunks(storageKey, encoded);

  const cookies = chunks.map(({ name, value }) => ({
    name,
    value,
    domain: 'localhost',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }));

  // localStorage also stores raw JSON (used by browser supabase-js client)
  const origins = [
    {
      origin,
      localStorage: [
        {
          name: storageKey,
          value: sessionJson,
        },
      ],
    },
  ];

  return { cookies, origins };
}

/**
 * Global setup for E2E tests.
 *
 * Uses direct REST API authentication to capture sessions, then constructs
 * Playwright storageState JSON files using @supabase/ssr's base64url cookie
 * encoding — no headless browser required.
 */
async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    throw new Error(
      '[globalSetup] SUPABASE_URL, ANON_KEY, or SERVICE_ROLE_KEY is missing. ' +
        'Did you run this using the run-with-stack wrapper?'
    );
  }

  console.log(`[globalSetup] Using Supabase Stack: ${supabaseUrl}`);

  const authDir = path.join(process.cwd(), 'playwright/.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Save dynamic environment for test workers
  const envData = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
  fs.writeFileSync(path.join(authDir, 'stack-env.json'), JSON.stringify(envData, null, 2));
  console.log(`[globalSetup] Stack environment saved.`);

  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';

  // Derive the cookie storage key from the Supabase URL
  // @supabase/ssr uses: sb-<project-ref>-auth-token
  // Project ref = hostname (e.g. "localhost" from http://localhost:33278)
  const supabaseUrlObj = new URL(supabaseUrl);
  const projectRef = supabaseUrlObj.hostname; // e.g. "localhost"
  const storageKey = `sb-${projectRef}-auth-token`;

  console.log(`[globalSetup] Cookie storage key: ${storageKey}`);

  const projects = ['chromium', 'firefox', 'webkit'];
  const testPassword = 'Password123!';

  const throwErrorIfFailed = async (res: Response, msg: string) => {
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${msg}: ${res.status} ${res.statusText} - ${body}`);
    }
    return res;
  };

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
      const authPath = testUser.authPath;

      console.log(`[globalSetup:${project}:${testUser.type}] Preparing user: ${testEmail}`);

      try {
        // 1. List users via Admin API
        const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users`;
        const listRes = await fetch(`${authAdminUrl}?page=1&per_page=1000`, {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        });
        await throwErrorIfFailed(listRes, 'Failed to list users');
        const { users } = (await listRes.json()) as {
          users?: { id: string; email?: string }[];
        };
        let user = users?.find((u) => u.email === testEmail);

        // 2. Create user if not exists
        if (!user) {
          console.log(`[globalSetup:${project}:${testUser.type}] Creating new user via Admin...`);
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
          user = (await (
            await throwErrorIfFailed(createRes, 'Failed to create user')
          ).json()) as { id: string };
        }

        if (!user?.id) {
          throw new Error(`User not found or created: ${testEmail}`);
        }

        // 3. Reset profile via service role (use UPSERT to ensure it exists)
        const profilePayload = { id: user.id, ...testUser.profile };
        const patchRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify(profilePayload),
          }
        );
        await throwErrorIfFailed(patchRes, 'Failed to upsert profile');

        // Verify profile actually exists
        const verifyRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
           headers: {
             apikey: serviceRoleKey,
             Authorization: `Bearer ${serviceRoleKey}`,
           }
        });
        const profiles = await verifyRes.json();
        if (!profiles || profiles.length === 0) {
           throw new Error(`Profile not found in database for user ${user.id} after upserting!`);
        }


        // 4. Authenticate via REST to get a fresh session
        console.log(`[globalSetup:${project}:${testUser.type}] Authenticating via REST...`);
        const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
          },
          body: JSON.stringify({ email: testEmail, password: testPassword }),
        });
        const session = await (await throwErrorIfFailed(loginRes, 'Auth failed')).json();

        // 5. Construct storageState using @supabase/ssr cookie encoding (no browser required)
        const storageState = buildStorageState(session, storageKey, baseURL);
        fs.writeFileSync(authPath, JSON.stringify(storageState, null, 2));
        console.log(
          `[globalSetup:${project}:${testUser.type}] Auth state saved to ${authPath} ` +
            `(${storageState.cookies.length} cookie chunk(s))`
        );
      } catch (err) {
        console.error(`[globalSetup:${project}:${testUser.type}] Setup failed:`, err);
        throw err;
      }
    }
  }

  console.log(`[globalSetup] All sessions generated successfully.`);
}

export default globalSetup;
