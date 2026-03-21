import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware for session management and auth-based routing.
 *
 * PERFORMANCE OPTIMIZATION: Uses route-based auth strategy:
 * - Public routes: Skip auth check entirely (fastest)
 * - Auth routes: Use getSession() - reads local cookie, no network call
 * - Protected routes: Use getUser() - secure JWT verification with Supabase
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Route classification for optimized auth checking
  const isPublicRoute =
    pathname === '/' || pathname.startsWith('/landing') || pathname.startsWith('/docs');
  const isAuthRoute = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(
    pathname
  );
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding');

  // PUBLIC ROUTES: Skip auth check entirely - fastest path
  if (isPublicRoute) {
    return supabaseResponse;
  }

  // AUTH ROUTES: Use getSession() - no network call, just reads local cookie
  if (isAuthRoute) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Redirect authenticated users away from auth pages
    if (session) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  // PROTECTED ROUTES: Use getUser() - secure JWT verification with Supabase
  if (isProtectedRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect unauthenticated users to login
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
