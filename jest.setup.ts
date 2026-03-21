import '@testing-library/jest-dom';

// Force UTC for all tests to ensure consistent date formatting
process.env.TZ = 'UTC';

// Set up Supabase environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Node 22+ (which the user is running) has global fetch, Request, Response, TextEncoder, TextDecoder, etc.
// No polyfills needed if running in 'node' test environment.

// Mock cn utility globally for all tests - Phase 1: Fix ~40 failing integration tests
jest.mock('@/lib/utils', () => {
  // Helper function to get display name (matching actual implementation)
  const getUserDisplayName = (profile: unknown, userId?: string): string => {
    if (!profile) {
      return userId ? `User ${userId.slice(0, 4)}` : 'Unknown User';
    }
    return (
      (profile as { full_name?: string })?.full_name ||
      (profile as { username?: string })?.username ||
      (userId ? `User ${userId.slice(0, 4)}` : 'Unknown User')
    );
  };

  // Helper function to get initials (matching actual implementation)
  const getUserInitials = (profile: unknown, userId?: string): string => {
    const name = getUserDisplayName(profile, userId);
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return {
    cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
    getUserDisplayName,
    getUserInitials,
  };
});
