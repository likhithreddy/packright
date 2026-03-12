declare global {
  var __SUPABASE_STACK_STOP__: (() => Promise<void>) | undefined;
}

/**
 * Global teardown for E2E tests.
 *
 * This script ensures that any ephemeral Supabase stacks started in globalSetup
 * are properly stopped and cleaned up.
 */
async function globalTeardown() {
  if (global.__SUPABASE_STACK_STOP__) {
    console.log('[globalTeardown] Stopping Supabase stack...');
    try {
      await global.__SUPABASE_STACK_STOP__();
      console.log('[globalTeardown] Supabase stack stopped successfully.');
    } catch (err) {
      console.error('[globalTeardown] Failed to stop Supabase stack:', err);
    }
  }
}

export default globalTeardown;
