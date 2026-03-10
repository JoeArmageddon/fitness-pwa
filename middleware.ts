// ============================================================
// MIDDLEWARE — Auth guard + onboarding redirect
// Runs on every request before page renders
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/auth', '/api/auth/callback'];

// Routes excluded from middleware entirely
const EXCLUDED_PREFIXES = ['/_next/', '/icons/', '/splash/', '/.well-known/', '/manifest.json'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static files and Next.js internals
  if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip all API routes — they handle their own authentication (return 401 JSON)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  // Create Supabase client with request/response cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try { res.cookies.set(name, value, options as any); } catch {}
        },
        remove(name: string, options: Record<string, unknown>) {
          try { res.cookies.set(name, '', { ...options, maxAge: 0 } as any); } catch {}
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // If no session and not a public route, redirect to auth
  if (!session && !PUBLIC_ROUTES.includes(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated, check onboarding status (only for page routes, not API)
  if (session && !pathname.startsWith('/api/') && pathname !== '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', session.user.id)
      .single();

    if (profile && !profile.onboarded) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/onboarding';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
