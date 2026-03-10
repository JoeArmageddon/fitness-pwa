// ============================================================
// POST /api/ai/parse-workout
// Server-side only — GROQ_API_KEY never leaves the server
// Parses workout schedule text into structured program data
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, createSupabaseServerClient } from '@/lib/supabase-server';
import { localWorkoutParser, safeJSONParser, inferMuscleGroup } from '@/lib/ai';
import { sanitizeText, validateParsedWorkout } from '@/lib/sanitize';
import { getLimit } from '@/lib/limits';
import { checkRateLimit } from '@/lib/rate-limit';
import type { ParsedWorkoutProgram, MuscleGroup, Plan } from '@/types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const VALID_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'legs', 'quads', 'hamstrings', 'glutes', 'calves',
  'core', 'forearms', 'traps', 'lats', 'full_body',
];

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
              'You are an expert personal trainer and workout program analyst. ' +
              'You ONLY respond with valid JSON. No markdown, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/** Sanitize and validate muscle group from AI output */
function sanitizeMuscleGroup(mg: unknown): MuscleGroup {
  if (typeof mg === 'string' && (VALID_MUSCLE_GROUPS as string[]).includes(mg)) {
    return mg as MuscleGroup;
  }
  return 'full_body';
}

/** Sanitize parsed workout program from AI */
function sanitizeWorkoutProgram(raw: unknown): ParsedWorkoutProgram | null {
  if (!validateParsedWorkout(raw)) return null;
  const obj = raw as { days: unknown[] };

  return {
    days: obj.days.map((day: unknown) => {
      const d = day as Record<string, unknown>;
      const exercises = Array.isArray(d.exercises) ? d.exercises : [];
      return {
        day_name: String(d.day_name ?? '').slice(0, 50),
        focus: d.focus ? String(d.focus).slice(0, 100) : undefined,
        exercises: exercises.slice(0, 20).map((ex: unknown) => {
          const e = ex as Record<string, unknown>;
          const name = String(e.name ?? '').slice(0, 80);
          return {
            name,
            sets: Math.min(10, Math.max(1, Number(e.sets) || 3)),
            reps: String(e.reps ?? '10').slice(0, 10),
            muscle_group: e.muscle_group
              ? sanitizeMuscleGroup(e.muscle_group)
              : inferMuscleGroup(name),
          };
        }),
      };
    }).filter((d) => d.day_name && d.exercises.length > 0),
  };
}

export async function POST(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────
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
  const rl = checkRateLimit(`parse-workout:${session.user.id}`, dailyLimit);
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

  // ── Parse and sanitize body ───────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = sanitizeText(body.text);

  if (!text || text.length < 10) {
    return NextResponse.json({ error: 'Workout text is too short' }, { status: 400 });
  }

  // ── Step 1: Local parser (instant preview) ────────────────
  const localResult = localWorkoutParser(text);
  const totalExercises = localResult.days.flatMap((d) => d.exercises).length;
  const localConfidence = totalExercises === 0 ? 'low' : localResult.days.length >= 2 ? 'high' : 'medium';

  // If local parser got a confident result, return it
  if (localConfidence === 'high' && localResult.days.length >= 2) {
    return NextResponse.json({ data: localResult, source: 'local', confidence: 'high' });
  }

  // ── Step 2: Groq AI for ambiguous/complex formats ─────────
  const prompt = `Parse this gym workout program into structured JSON.

Text:
"""
${text}
"""

Return a JSON object with this exact structure:
{
  "days": [
    {
      "day_name": "Monday",
      "focus": "Chest + Triceps",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "reps": "8-10",
          "muscle_group": "chest"
        }
      ]
    }
  ]
}

Rules:
- muscle_group must be exactly one of: chest, back, shoulders, biceps, triceps, legs, quads, hamstrings, glutes, calves, core, forearms, traps, lats, full_body
- sets must be a number (1-10)
- reps can be a range "8-12" or single number "10"
- day_name should preserve the original name (Monday, Push Day, etc.)
- Extract ALL days and exercises from the text
- Maximum 14 days, maximum 20 exercises per day`;

  const aiText = await callGroq(prompt);

  if (aiText) {
    const rawParsed = safeJSONParser<unknown>(aiText);
    const sanitized = sanitizeWorkoutProgram(rawParsed);

    if (sanitized && sanitized.days.length > 0) {
      return NextResponse.json({
        data: sanitized,
        source: 'groq',
        confidence: sanitized.days.length >= 2 ? 'high' : 'medium',
      });
    }
  }

  // ── Step 3: Return local result ───────────────────────────
  return NextResponse.json({
    data: localResult,
    source: 'local',
    confidence: localConfidence,
  });
}
