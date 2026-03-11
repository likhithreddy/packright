/**
 * @jest-environment node
 */
if (typeof Request === 'undefined') {
  global.Request = require('node-fetch').Request;
  global.Response = require('node-fetch').Response;
  global.Headers = require('node-fetch').Headers;
}

import { middleware } from '../../src/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Mock Supabase SSR
jest.mock('@supabase/ssr');

// Mock NextResponse
jest.spyOn(NextResponse, 'next').mockImplementation(
  () =>
    ({
      cookies: { set: jest.fn() },
      headers: new Headers(),
    }) as unknown as NextResponse
);

jest.spyOn(NextResponse, 'redirect').mockImplementation(
  (url: string | URL) =>
    ({
      cookies: { set: jest.fn() },
      headers: new Headers(),
      url: url.toString(),
    }) as unknown as NextResponse
);

describe('Auth Middleware', () => {
  let mockGetUser: jest.Mock;
  let mockAuth: { getUser: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock user behavior
    mockGetUser = jest.fn();
    mockAuth = {
      getUser: mockGetUser,
    };

    (createServerClient as jest.Mock).mockReturnValue({
      auth: mockAuth,
    });
  });

  const createMockRequest = (pathname: string) => {
    return new NextRequest(new URL(`http://localhost:3000${pathname}`));
  };

  it('redirects unauthenticated users from /dashboard to /login with next param', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = createMockRequest('/dashboard');

    await middleware(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    expect(redirectUrl.toString()).toContain('/login?next=%2Fdashboard');
  });

  it('redirects unauthenticated users from /onboarding to /login with next param', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = createMockRequest('/onboarding');

    await middleware(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    expect(redirectUrl.toString()).toContain('/login?next=%2Fonboarding');
  });

  it('allows authenticated users to access /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    const req = createMockRequest('/dashboard');

    await middleware(req);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('redirects authenticated users away from /login to /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    const req = createMockRequest('/login');

    await middleware(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    expect(redirectUrl.toString()).toContain('/dashboard');
  });

  it('redirects authenticated users away from auth pages', async () => {
    const authRoutes = ['/signup', '/forgot-password', '/reset-password'];

    for (const route of authRoutes) {
      jest.clearAllMocks();
      mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
      const req = createMockRequest(route);
      await middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.toString()).toContain('/dashboard');
    }
  });

  it('allows unauthenticated users to access public root /', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = createMockRequest('/');

    await middleware(req);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('triggers cookie handlers to ensure full coverage', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    // Mock cookie store methods
    const mockCookies = {
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    };

    const req = {
      nextUrl: new URL('http://localhost:3000/'),
      cookies: mockCookies,
    } as unknown as NextRequest;

    (createServerClient as jest.Mock).mockImplementation((_url, _key, { cookies }) => {
      // Trigger the handlers with one cookie to exercise internal loops
      cookies.getAll();
      cookies.setAll([{ name: 'test', value: 'test', options: { path: '/' } }]);
      return {
        auth: { getUser: mockGetUser },
      };
    });

    await middleware(req);

    expect(mockCookies.getAll).toHaveBeenCalled();
    expect(NextResponse.next).toHaveBeenCalled();
  });
});
