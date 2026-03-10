// ============================================================
// AI UTILITIES - Pure client-safe functions only
// All actual AI API calls are in server-side /api/ai/* routes
// ============================================================

import type {
  AIResponse,
  ParsedFoodEntry,
  ParsedWorkoutProgram,
  MuscleGroup,
} from '@/types';

// ── Safe JSON Parser ───────────────────────────────────────

export function safeJSONParser<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonMatch = raw.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ── Muscle Group Auto-Assignment ───────────────────────────

const MUSCLE_KEYWORDS: Record<MuscleGroup, string[]> = {
  chest: ['bench', 'press', 'fly', 'pec', 'chest', 'push up', 'pushup', 'incline', 'decline', 'cable fly', 'dumbbell press'],
  back: ['row', 'pullup', 'pull up', 'pulldown', 'lat', 'deadlift', 'back', 'rhomboid', 'seated row', 'cable row', 'rack pull'],
  shoulders: ['shoulder', 'lateral raise', 'front raise', 'shrug', 'overhead', 'ohp', 'delt', 'military', 'arnold', 'face pull'],
  biceps: ['curl', 'bicep', 'biceps', 'hammer', 'barbell curl', 'db curl', 'preacher', 'concentration'],
  triceps: ['tricep', 'triceps', 'pushdown', 'extension', 'skull', 'dip', 'overhead extension', 'close grip', 'cable pushdown'],
  legs: ['leg', 'squat', 'lunge', 'quad', 'leg extension', 'leg curl', 'wall sit'],
  quads: ['squat', 'quad', 'leg extension', 'front squat', 'hack squat', 'bulgarian', 'sissy'],
  hamstrings: ['hamstring', 'rdl', 'leg curl', 'stiff leg', 'good morning', 'nordic', 'glute ham'],
  glutes: ['glute', 'hip thrust', 'kickback', 'bridge', 'sumo', 'abduction', 'cable kickback'],
  calves: ['calf', 'calves', 'standing calf', 'seated calf', 'calf raise', 'donkey calf'],
  core: ['plank', 'crunch', 'abs', 'sit up', 'russian twist', 'core', 'hollow', 'leg raise', 'cable crunch', 'ab wheel'],
  forearms: ['forearm', 'wrist curl', 'reverse curl', 'grip', 'farmer', 'pinch'],
  traps: ['shrug', 'trap', 'face pull', 'upright row', 'rack pull'],
  lats: ['lat', 'pullup', 'pulldown', 'pull up', 'pull down', 'straight arm'],
  full_body: ['clean', 'snatch', 'thruster', 'burpee', 'full body', 'kettlebell swing'],
};

export function inferMuscleGroup(exerciseName: string): MuscleGroup {
  const lower = exerciseName.toLowerCase();
  for (const [muscle, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return muscle as MuscleGroup;
    }
  }
  return 'full_body';
}

// ── LOCAL WORKOUT PARSER ───────────────────────────────────

/**
 * Pure regex parser — no AI, no network.
 * Parses text like:
 *   Monday: Chest + Triceps
 *   - Bench Press 4x8
 *   - Incline DB Press 3x10-12
 */
export function localWorkoutParser(text: string): ParsedWorkoutProgram {
  const days: ParsedWorkoutProgram['days'] = [];

  const dayBlocks = text.split(/\n(?=\w.*:)/);

  for (const block of dayBlocks) {
    const lines = block.trim().split('\n').filter(Boolean);
    if (!lines.length) continue;

    const headerMatch = lines[0].match(/^(.+?):\s*(.*)$/);
    if (!headerMatch) continue;

    const dayName = headerMatch[1].trim();
    const focus = headerMatch[2].trim() || undefined;
    const exercises: ParsedWorkoutProgram['days'][0]['exercises'] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim().replace(/^[-•*]\s*/, '');
      const exMatch = line.match(/^(.+?)\s+(\d+)\s*[xX×]\s*([\d-]+)\s*$/);
      if (!exMatch) continue;

      const name = exMatch[1].trim();
      const sets = parseInt(exMatch[2], 10);
      const reps = exMatch[3];

      if (name && sets > 0) {
        exercises.push({ name, sets, reps, muscle_group: inferMuscleGroup(name) });
      }
    }

    if (exercises.length > 0) {
      days.push({ day_name: dayName, focus, exercises });
    }
  }

  return { days };
}

/** Returns local parse with confidence score. Used as a client-side preview. */
export function parseWorkoutTextLocal(text: string): AIResponse<ParsedWorkoutProgram> {
  const localResult = localWorkoutParser(text);
  const totalExercises = localResult.days.flatMap((d) => d.exercises).length;
  const confidence =
    totalExercises === 0 ? 'low' : localResult.days.length >= 2 ? 'high' : 'medium';

  return { data: localResult, source: 'local', confidence };
}

// ── LOCAL FOOD PARSER ──────────────────────────────────────

const INDIAN_FOOD_DB: Record<string, { cal: number; p: number; c: number; f: number; serving: number }> = {
  roti: { cal: 297, p: 9.9, c: 60.8, f: 3.7, serving: 30 },
  chapati: { cal: 297, p: 9.9, c: 60.8, f: 3.7, serving: 30 },
  paratha: { cal: 326, p: 8.4, c: 46.9, f: 12.1, serving: 60 },
  dal: { cal: 116, p: 9, c: 20, f: 0.4, serving: 150 },
  'dal fry': { cal: 130, p: 7, c: 18, f: 3.5, serving: 200 },
  'toor dal': { cal: 116, p: 7.2, c: 20.7, f: 0.7, serving: 150 },
  'moong dal': { cal: 105, p: 7.6, c: 19.0, f: 0.4, serving: 150 },
  'masoor dal': { cal: 116, p: 9.0, c: 20.1, f: 0.4, serving: 150 },
  rice: { cal: 130, p: 2.7, c: 28, f: 0.3, serving: 150 },
  'brown rice': { cal: 123, p: 2.6, c: 25.6, f: 0.9, serving: 150 },
  'chicken breast': { cal: 165, p: 31, c: 0, f: 3.6, serving: 100 },
  chicken: { cal: 165, p: 31, c: 0, f: 3.6, serving: 100 },
  paneer: { cal: 265, p: 18, c: 3.4, f: 20, serving: 100 },
  egg: { cal: 155, p: 13, c: 1.1, f: 11, serving: 50 },
  eggs: { cal: 155, p: 13, c: 1.1, f: 11, serving: 50 },
  banana: { cal: 89, p: 1.1, c: 23, f: 0.3, serving: 118 },
  apple: { cal: 52, p: 0.3, c: 14, f: 0.2, serving: 182 },
  milk: { cal: 42, p: 3.4, c: 5, f: 1, serving: 240 },
  curd: { cal: 98, p: 11, c: 3.4, f: 4.3, serving: 200 },
  yogurt: { cal: 98, p: 11, c: 3.4, f: 4.3, serving: 200 },
  'peanut butter': { cal: 588, p: 25, c: 20, f: 50, serving: 32 },
  oats: { cal: 389, p: 17, c: 66, f: 7, serving: 80 },
  bread: { cal: 265, p: 9, c: 49, f: 3.2, serving: 30 },
  rajma: { cal: 337, p: 22, c: 61, f: 1.4, serving: 150 },
  chickpea: { cal: 364, p: 19, c: 61, f: 6, serving: 150 },
  chhole: { cal: 364, p: 19, c: 61, f: 6, serving: 150 },
  chole: { cal: 364, p: 19, c: 61, f: 6, serving: 150 },
  idli: { cal: 39, p: 2, c: 7.9, f: 0.2, serving: 50 },
  dosa: { cal: 168, p: 3.7, c: 25, f: 5.9, serving: 100 },
  sambar: { cal: 44, p: 2.5, c: 7, f: 1.2, serving: 150 },
  poha: { cal: 110, p: 2.4, c: 23, f: 0.9, serving: 80 },
  upma: { cal: 135, p: 3, c: 22, f: 4, serving: 150 },
  whey: { cal: 400, p: 80, c: 8, f: 4, serving: 30 },
  'protein shake': { cal: 120, p: 25, c: 3, f: 1.5, serving: 30 },
  tuna: { cal: 116, p: 25.5, c: 0, f: 0.5, serving: 100 },
  fish: { cal: 136, p: 20, c: 0, f: 6, serving: 100 },
  almonds: { cal: 579, p: 21, c: 22, f: 50, serving: 28 },
  walnuts: { cal: 654, p: 15, c: 14, f: 65, serving: 28 },
  mango: { cal: 60, p: 0.8, c: 15, f: 0.4, serving: 150 },
  guava: { cal: 68, p: 2.6, c: 14.3, f: 1.0, serving: 100 },
  ghee: { cal: 900, p: 0, c: 0, f: 100, serving: 10 },
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  half: 0.5, a: 1, an: 1,
};

function parseQuantity(text: string): number {
  const numMatch = text.match(/(\d+\.?\d*)/);
  if (numMatch) return parseFloat(numMatch[1]);
  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    if (text.toLowerCase().includes(word)) return val;
  }
  return 1;
}

export function localFoodParser(text: string): ParsedFoodEntry {
  const lower = text.toLowerCase();
  const items: ParsedFoodEntry['items'] = [];
  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;

  for (const [foodName, macro] of Object.entries(INDIAN_FOOD_DB)) {
    if (lower.includes(foodName)) {
      const pattern = new RegExp(
        `(\\d+\\.?\\d*|\\w+)\\s*(?:piece|pieces|roti|bowl|cup|glass|plate|scoop|g)?\\s*${foodName}`,
        'i'
      );
      const match = lower.match(pattern);
      let quantity = 1;
      if (match) quantity = parseQuantity(match[1]);

      const servingG = macro.serving * quantity;
      const factor = servingG / 100;

      const cal = Math.round(macro.cal * factor);
      const p = Math.round(macro.p * factor * 10) / 10;
      const c = Math.round(macro.c * factor * 10) / 10;
      const f = Math.round(macro.f * factor * 10) / 10;

      items.push({
        name: `${quantity > 1 ? quantity + ' ' : ''}${foodName}`,
        quantity_g: servingG,
        calories: cal,
        protein: p,
        carbs: c,
        fat: f,
      });

      totalCal += cal;
      totalP += p;
      totalC += c;
      totalF += f;
    }
  }

  return {
    items,
    total_calories: Math.round(totalCal),
    total_protein: Math.round(totalP * 10) / 10,
    total_carbs: Math.round(totalC * 10) / 10,
    total_fat: Math.round(totalF * 10) / 10,
    confidence: items.length > 0 ? 'medium' : 'low',
  };
}

// ── Progressive Overload Logic ─────────────────────────────

export interface OverloadSuggestion {
  type: 'increase_weight' | 'deload' | 'reduce_volume' | 'maintain';
  message: string;
  detail: string;
}

export function analyzeProgressiveOverload(
  recentSets: Array<{
    weight: number;
    reps: number;
    target_reps_min: number;
    target_reps_max: number;
    rpe?: number;
  }>,
  weeklyStrengthTrend: number[],
): OverloadSuggestion {
  if (!recentSets.length) {
    return { type: 'maintain', message: 'No data yet', detail: 'Log more sessions to get suggestions.' };
  }

  const allHitMax = recentSets.every((s) => s.reps >= s.target_reps_max);
  const avgRPE = recentSets.reduce((a, b) => a + (b.rpe ?? 7), 0) / recentSets.length;

  const isStrengthDeclining =
    weeklyStrengthTrend.length >= 3 &&
    weeklyStrengthTrend[weeklyStrengthTrend.length - 1] <
      weeklyStrengthTrend[weeklyStrengthTrend.length - 2] &&
    weeklyStrengthTrend[weeklyStrengthTrend.length - 2] <
      weeklyStrengthTrend[weeklyStrengthTrend.length - 3];

  if (avgRPE > 9 && isStrengthDeclining) {
    return {
      type: 'deload',
      message: 'Deload Recommended',
      detail: 'RPE consistently >9 with declining strength. Take a deload week at 50-60% volume.',
    };
  }

  if (isStrengthDeclining) {
    return {
      type: 'reduce_volume',
      message: 'Reduce Volume',
      detail: 'Strength has been declining 3 weeks. Consider reducing volume by 20% and focusing on quality.',
    };
  }

  if (allHitMax && avgRPE <= 8) {
    return {
      type: 'increase_weight',
      message: 'Add Weight',
      detail: 'All sets hit top of rep range at manageable RPE. Add 2.5kg next session.',
    };
  }

  return {
    type: 'maintain',
    message: 'Keep Going',
    detail: 'Progress is solid. Keep current load and aim to hit the top of your rep range.',
  };
}

// ── Epley 1RM Formula ──────────────────────────────────────

export function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// ── Recovery Score Calculator ──────────────────────────────

export function calculateRecoveryScore(params: {
  sleep_hours: number;
  sleep_quality: number;
  stress_level: number;
  mood: number;
  soreness: number;
  energy_level: number;
}): number {
  const sleepScore = Math.min((params.sleep_hours / 8) * 100, 100) * 0.25;
  const qualityScore = (params.sleep_quality / 5) * 100 * 0.15;
  const stressScore = ((5 - params.stress_level + 1) / 5) * 100 * 0.2;
  const moodScore = (params.mood / 5) * 100 * 0.15;
  const sorenessScore = ((5 - params.soreness + 1) / 5) * 100 * 0.1;
  const energyScore = (params.energy_level / 5) * 100 * 0.15;
  return Math.round(sleepScore + qualityScore + stressScore + moodScore + sorenessScore + energyScore);
}

// ── Plateau Detection ──────────────────────────────────────

export function detectPlateau(weights: Array<{ date: string; weight_kg: number }>): {
  detected: boolean;
  days: number;
  message?: string;
} {
  if (weights.length < 14) return { detected: false, days: 0 };

  const recent = weights.slice(-14);
  const min = Math.min(...recent.map((w) => w.weight_kg));
  const max = Math.max(...recent.map((w) => w.weight_kg));
  const range = max - min;

  if (range < 0.5) {
    return {
      detected: true,
      days: 14,
      message: `Weight has been within ${range.toFixed(1)}kg range for 14 days. Consider adjusting calories.`,
    };
  }

  return { detected: false, days: 0 };
}
