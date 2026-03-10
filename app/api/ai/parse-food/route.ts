// ============================================================
// POST /api/ai/parse-food
// Server-side only — GROQ_API_KEY never leaves the server.
// No Gemini. Inputs sanitized. Outputs validated.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, createSupabaseServerClient } from '@/lib/supabase-server';
import { localFoodParser, safeJSONParser } from '@/lib/ai';
import { sanitizeText, sanitizeEnum, validateParsedFood } from '@/lib/sanitize';
import { getLimit } from '@/lib/limits';
import { checkRateLimit } from '@/lib/rate-limit';
import type { MealType, ParsedFoodEntry, Plan } from '@/types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];

async function callGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'You are a certified nutritionist specializing in Indian cuisine. ' +
              'Respond ONLY with valid JSON. No markdown, no explanations. ' +
              'Use accurate values from USDA/ICMR databases.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.05,
        max_tokens: 1024,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Rate limit (per user, per day) ────────────────────────
  const supabase = createSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', session.user.id)
    .single();
  const plan = ((profile?.plan ?? 'free') as Plan);
  const dailyLimit = getLimit(plan, 'ai_parses_per_day');
  const rl = checkRateLimit(`parse-food:${session.user.id}`, dailyLimit);
  if (!rl.allowed) {
    const resetHours = Math.ceil((rl.resetAt - Date.now()) / 3_600_000);
    return NextResponse.json(
      { error: `Daily AI limit reached (${dailyLimit}/day on free plan). Resets in ~${resetHours}h. Upgrade to Pro for unlimited.` },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(dailyLimit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
          'Retry-After': String(resetHours * 3600),
        },
      }
    );
  }

  // ── Sanitize input ────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = sanitizeText(body.text, 500); // cap meal descriptions at 500 chars
  const meal_type = sanitizeEnum<MealType>(body.meal_type, MEAL_TYPES, 'snack');

  if (!text || text.length < 2) {
    return NextResponse.json({ error: 'Text is required (min 2 chars)' }, { status: 400 });
  }

  // ── Local parser first (zero cost, instant) ───────────────
  const localResult = localFoodParser(text);
  if (localResult.confidence !== 'low' && localResult.items.length > 0) {
    return NextResponse.json({ ...localResult, meal_type, source: 'local' });
  }

  // ── Groq AI (server-side, key stays secret) ───────────────
  const prompt = `Parse this meal into nutritional data.

Meal: "${text}"

Return JSON only:
{"items":[{"name":"food name","quantity_g":150,"calories":248,"protein":46.5,"carbs":0,"fat":5.4,"fiber":0}],"total_calories":248,"total_protein":46.5,"total_carbs":0,"total_fat":5.4,"confidence":"high"}

Rules:
- Use ICMR values for Indian foods, USDA for others
- Realistic portions if size not specified
- confidence: high=well-known, medium=estimated, low=uncertain
- All values must be non-negative numbers`;

  const aiText = await callGroq(prompt);
  if (aiText) {
    const parsed = safeJSONParser<Omit<ParsedFoodEntry, 'confidence'> & { confidence?: string }>(aiText);
    if (parsed && validateParsedFood(parsed)) {
      return NextResponse.json({
        items: parsed.items,
        total_calories: parsed.total_calories,
        total_protein: parsed.total_protein,
        total_carbs: parsed.total_carbs,
        total_fat: parsed.total_fat ?? 0,
        confidence: parsed.confidence ?? 'medium',
        meal_type,
        source: 'groq',
      });
    }
  }

  // ── Fallback ──────────────────────────────────────────────
  return NextResponse.json({
    ...localResult,
    meal_type,
    source: 'local',
    error: 'AI unavailable — local estimates used',
  });
}
