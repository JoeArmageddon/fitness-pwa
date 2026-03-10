// ============================================================
// POST /api/leaderboard/update
// Computes and upserts current user's weekly leaderboard entry
// ============================================================

import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getServerSession } from '@/lib/supabase-server';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  const diff = (day === 0 ? -6 : 1) - day; // Monday offset
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const userId = session.user.id;
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  try {
    // Count workouts this week
    const { count: workoutsCount } = await supabase
      .from('workout_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEndStr);

    // Total volume this week
    const { data: setData } = await supabase
      .from('workout_sets')
      .select('weight, reps, workout_logs!inner(date, user_id)')
      .eq('workout_logs.user_id', userId)
      .gte('workout_logs.date', weekStart)
      .lte('workout_logs.date', weekEndStr)
      .eq('completed', true);

    const totalVolume = (setData ?? []).reduce(
      (sum: number, s: { weight: number; reps: number }) => sum + (s.weight * s.reps),
      0
    );

    // Streak: count consecutive days with any activity (workout OR nutrition OR recovery)
    const { data: activityDays } = await supabase
      .from('workout_logs')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);

    let streak = 0;
    if (activityDays && activityDays.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const dates = new Set(activityDays.map((d: { date: string }) => d.date));
      let current = new Date(today);
      while (dates.has(current.toISOString().slice(0, 10))) {
        streak++;
        current.setDate(current.getDate() - 1);
      }
    }

    // Points calculation
    const workouts = workoutsCount ?? 0;
    const streakBonus = streak >= 5 ? 1.5 : 1;
    const points = Math.round(
      (workouts * 10 + Math.floor(totalVolume / 1000) * 2 + streak * 1) * streakBonus
    );

    // Upsert leaderboard entry
    const { error } = await supabase
      .from('leaderboard_entries')
      .upsert(
        {
          user_id: userId,
          week_start: weekStart,
          workouts_count: workouts,
          total_volume_kg: Math.round(totalVolume * 10) / 10,
          streak_days: streak,
          points,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,week_start' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, points, workouts, streak });
  } catch (e) {
    console.error('Leaderboard update error:', e);
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 });
  }
}
