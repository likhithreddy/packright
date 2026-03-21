import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware for session management and auth-based routing.
 *
 * This implementation uses getUser() for secure JWT verification on every request.
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

  /**
   * IMPORTANT: getUser() verifies the JWT with Supabase.
   * This is more secure than getSession() which only reads the cookie locally.
   */
  console.log(`[MIDDLEWARE] URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  console.log(`[MIDDLEWARE] User: ${user?.id ?? 'null'}, Error: ${error?.message ?? 'none'}`);

  const { pathname } = request.nextUrl;

  // Define protected routes
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding');

  // Define auth routes (where authenticated users should not go)
  const isAuthRoute = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(
    pathname
  );

  // 1. Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    // Add 'next' parameter to return after login
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Redirect authenticated users away from auth-related pages
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
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
