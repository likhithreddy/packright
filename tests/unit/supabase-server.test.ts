import { createClient } from '../../src/lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

describe('Supabase Server Client Library', () => {
  const mockCookies = {
    getAll: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (cookies as jest.Mock).mockResolvedValue(mockCookies);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  const originalEnv = process.env;
  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a client properly providing all cookie handlers', async () => {
    const mockClient = { auth: {} };
    (createServerClient as jest.Mock).mockReturnValue(mockClient);

    const client = await createClient();
    expect(client).toBe(mockClient);
    expect(createServerClient).toHaveBeenCalledWith(
      'http://localhost',
      'test-key',
      expect.any(Object)
    );

    // Call the cookie handlers to achieve full line coverage
    const callArgs = (createServerClient as jest.Mock).mock.calls[0][2];
    callArgs.cookies.getAll();
    expect(mockCookies.getAll).toHaveBeenCalled();

    callArgs.cookies.setAll([{ name: 'foo', value: 'bar', options: {} }]);
    expect(mockCookies.set).toHaveBeenCalledWith('foo', 'bar', {});
  });

  it('ignores errors in setAll (Server Component limitation)', async () => {
    mockCookies.set.mockImplementationOnce(() => {
      throw new Error('Cannot set cookies in Server Component');
    });

    await createClient();
    const callArgs = (createServerClient as jest.Mock).mock.calls[0][2];

    // This should not throw
    expect(() => {
      callArgs.cookies.setAll([{ name: 'foo', value: 'bar', options: {} }]);
    }).not.toThrow();
  });
});
