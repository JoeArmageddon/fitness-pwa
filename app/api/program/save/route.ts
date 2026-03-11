// ============================================================
// POST /api/program/save
// Saves a parsed workout program server-side.
// Uses admin client (service_role) if available to bypass RLS,
// otherwise falls back to user-session client.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  let body: { name: string; days: any[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, days } = body;
  if (!name?.trim() || !Array.isArray(days) || days.length === 0) {
    return NextResponse.json({ error: 'Missing name or days' }, { status: 400 });
  }

  // Use admin client (bypasses RLS) if service_role key is available,
  // otherwise fall back to user-session client.
  const admin = createSupabaseAdminClient();
  const db = admin ?? createSupabaseServerClient();

  try {
    // 1. Insert program
    const { data: prog, error: pe } = await db
      .from('programs')
      .insert({ name: name.trim(), mode: 'fixed', is_active: false, user_id: userId })
      .select('id')
      .single();
    if (pe) throw pe;

    // 2. Insert program_days + exercises
    for (let di = 0; di < days.length; di++) {
      const day = days[di];
      const { data: dayRow, error: de } = await db
        .from('program_days')
        .insert({
          program_id: prog.id,
          day_name: day.day_name,
          focus: day.focus ?? null,
          order_index: di,
        })
        .select('id')
        .single();
      if (de) throw de;

      if (day.exercises?.length) {
        const { error: ee } = await db.from('program_exercises').insert(
          day.exercises.map((ex: any, ei: number) => ({
            program_day_id: dayRow.id,
            name: ex.name,
            muscle_group: ex.muscle_group ?? 'other',
            sets: ex.sets ?? 3,
            reps: String(ex.reps ?? '10'),
            order_index: ei,
          }))
        );
        if (ee) throw ee;
      }
    }

    return NextResponse.json({ success: true, program_id: prog.id });
  } catch (err: any) {
    console.error('[program/save]', err);
    return NextResponse.json(
      { error: err?.message ?? 'Save failed' },
      { status: 500 }
    );
  }
}
