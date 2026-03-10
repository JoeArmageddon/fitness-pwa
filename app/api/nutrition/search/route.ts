// ============================================================
// GET /api/nutrition/search?q={query}
// Combines local Indian food DB + OpenFoodFacts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/supabase-server';
import { searchFoods } from '@/lib/food-database';
import { searchOpenFoodFacts } from '@/lib/openfoods';
import { sanitizeQuery } from '@/lib/sanitize';

export async function GET(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawQuery = req.nextUrl.searchParams.get('q') ?? '';
  const query = sanitizeQuery(rawQuery);

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // ── Local results first (zero latency) ───────────────────
  const localResults = searchFoods(query, 10).map((f) => ({ ...f, source: 'local' as const }));

  // ── OpenFoodFacts results (parallel, with timeout) ────────
  let offResults: Awaited<ReturnType<typeof searchOpenFoodFacts>> = [];
  try {
    offResults = await searchOpenFoodFacts(query);
  } catch {
    // Silently fail — local results are still returned
  }

  // Deduplicate: skip OFF results whose name closely matches a local result
  const localNames = new Set(localResults.map((f) => f.name.toLowerCase()));
  const deduped = offResults.filter(
    (f) => !localNames.has(f.name.toLowerCase())
  );

  const combined = [...localResults, ...deduped].slice(0, 25);

  return NextResponse.json(
    { results: combined },
    {
      headers: {
        'Cache-Control': 'private, max-age=3600',
      },
    }
  );
}
