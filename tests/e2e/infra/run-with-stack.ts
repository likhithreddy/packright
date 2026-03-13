import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { startSupabaseStack } from './supabase-stack.js';

/**
 * Wrapper script to run a command (like 'playwright test') with an ephemeral Supabase stack.
 * It ensures the stack is started, environment variables are set, and creates .env.test
 * (does NOT modify .env.local which is for local development only).
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: ts-node run-with-stack.ts <command> [args...]');
    process.exit(1);
  }

  console.log('[run-with-stack] Starting ephemeral Supabase stack...');
  const stack = await startSupabaseStack();

  const envTestPath = path.join(process.cwd(), '.env.test');
  const authDir = path.join(process.cwd(), 'playwright/.auth');
  const stackEnvPath = path.join(authDir, 'stack-env.json');

  // Ensure auth directory exists and clean stale session files
  if (fs.existsSync(authDir)) {
    console.log('[run-with-stack] Cleaning stale auth files...');
    const files = fs.readdirSync(authDir);
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'stack-env.json') {
        fs.unlinkSync(path.join(authDir, file));
      }
    }
  } else {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create ephemeral .env.test and stack-env.json (NO backup needed, we don't touch .env.local)
  const envData = {
    NEXT_PUBLIC_SUPABASE_URL: stack.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: stack.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: stack.serviceRoleKey,
    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: stack.serviceRoleKey,
  };

  const ephemeralEnvContent = `# EPHEMERAL SUPABASE VARIABLES FOR E2E TESTS
NEXT_PUBLIC_SUPABASE_URL=${stack.supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${stack.anonKey}
SUPABASE_SERVICE_ROLE_KEY=${stack.serviceRoleKey}
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=${stack.serviceRoleKey}
`;
  console.log('[run-with-stack] Creating .env.test with ephemeral Supabase credentials.');
  fs.writeFileSync(envTestPath, ephemeralEnvContent);
  fs.writeFileSync(stackEnvPath, JSON.stringify(envData, null, 2));

  console.log('[run-with-stack] Stack ready. Variables exported to .env.test and stack-env.json');

  const [command, ...commandArgs] = args;
  console.log(`[run-with-stack] Running command: ${command} ${commandArgs.join(' ')}`);

  const child = spawn(command, commandArgs, {
    env: {
      ...process.env,
      ...envData,
    },
    stdio: 'inherit',
    shell: true,
  });

  const cleanup = async () => {
    console.log('[run-with-stack] Cleaning up...');

    // Stop Supabase stack
    try {
      await stack.stop();
      console.log('[run-with-stack] Supabase stack stopped.');
    } catch (err) {
      console.error('[run-with-stack] Error stopping stack:', err);
    }

    // Remove .env.test (we never touched .env.local)
    if (fs.existsSync(envTestPath)) {
      console.log('[run-with-stack] Removing .env.test...');
      fs.unlinkSync(envTestPath);
    }
  };

  child.on('exit', async (code) => {
    await cleanup();
    process.exit(code ?? 0);
  });

  // Handle unexpected interruptions
  process.on('SIGINT', async () => {
    child.kill('SIGINT');
    await cleanup();
    process.exit(130);
  });

  process.on('SIGTERM', async () => {
    child.kill('SIGTERM');
    await cleanup();
    process.exit(143);
  });
}

main().catch(async (err) => {
  console.error('[run-with-stack] Fatal error:', err);
  process.exit(1);
});
