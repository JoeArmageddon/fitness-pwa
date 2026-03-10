// ============================================================
// GET /api/auth/callback
// Handles Supabase OAuth redirect (Google Sign-In, magic link)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  // Only allow relative redirects (prevent open redirect attacks)
  const safeNext = next.startsWith('/') ? next : '/';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            try { cookieStore.set(name, value, options as any); } catch {}
          },
          remove(name: string, options: Record<string, unknown>) {
            try { cookieStore.set(name, '', { ...options, maxAge: 0 } as any); } catch {}
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, req.url));
    }
  }

  // Auth failed — redirect to auth page with error
  return NextResponse.redirect(new URL('/auth?error=auth_failed', req.url));
}
