// ============================================================
// POST /api/activate-pro
// Validates master key (server-side env var) and upgrades
// the authenticated user's plan to Pro in Supabase.
// ============================================================

import { NextResponse } from 'next/server';
import { getServerSession, createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { key } = body as { key?: string };

  const masterKey = process.env.PRO_MASTER_KEY;
  if (!key || !masterKey || key !== masterKey) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({ plan: 'pro' })
    .eq('id', session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
