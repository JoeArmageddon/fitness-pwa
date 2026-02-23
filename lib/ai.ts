// ============================================================
// AI INTEGRATION - Zero-cost with graceful fallback
// Supports: Gemini free tier, Groq free tier, local logic
// ============================================================

import type {
  AIResponse,
  ParsedFoodEntry,
  ParsedWorkoutProgram,
  MuscleGroup,
} from '@/types';

// ── Config ─────────────────────────────────────────────────

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;
const AI_AVAILABLE = !!(GEMINI_KEY || GROQ_KEY);

// ── Safe JSON Parser ───────────────────────────────────────

export function safeJSONParser<T>(raw: string): T | null {
  try {
    // Strip markdown code blocks if present
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to find JSON object/array in text
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

// ── Gemini API Call ────────────────────────────────────────

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

// ── Groq API Call ──────────────────────────────────────────

async function callGroq(prompt: string): Promise<string | null> {
  if (!GROQ_KEY) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content:
              'You are a structured data parser. Always respond with valid JSON only. No markdown, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ── Try AI with fallback ───────────────────────────────────

async function tryAI(prompt: string): Promise<{ text: string | null; source: 'gemini' | 'groq' }> {
  const geminiResult = await callGemini(prompt);
  if (geminiResult) return { text: geminiResult, source: 'gemini' };

  const groqResult = await callGroq(prompt);
  return { text: groqResult, source: 'groq' };
}

// ── Muscle Group Auto-Assignment ───────────────────────────

const MUSCLE_KEYWORDS: Record<MuscleGroup, string[]> = {
  chest: ['bench', 'press', 'fly', 'pec', 'chest', 'push up', 'pushup', 'incline', 'decline', 'cable fly'],
  back: ['row', 'pullup', 'pull up', 'pulldown', 'lat', 'deadlift', 'back', 'rhomboid', 'seated row', 'cable row'],
  shoulders: ['shoulder', 'press', 'lateral raise', 'front raise', 'shrug', 'overhead', 'ohp', 'delt', 'military'],
  biceps: ['curl', 'bicep', 'biceps', 'hammer', 'barbell curl', 'db curl'],
  triceps: ['tricep', 'triceps', 'pushdown', 'extension', 'skull', 'dip', 'overhead extension', 'close grip'],
  legs: ['leg', 'squat', 'lunge', 'press', 'quad', 'leg extension', 'leg curl'],
  quads: ['squat', 'quad', 'leg extension', 'front squat', 'hack squat', 'bulgarian'],
  hamstrings: ['hamstring', 'rdl', 'leg curl', 'stiff leg', 'deadlift', 'good morning'],
  glutes: ['glute', 'hip thrust', 'kickback', 'bridge', 'sumo'],
  calves: ['calf', 'calves', 'standing calf', 'seated calf', 'calf raise'],
  core: ['plank', 'crunch', 'abs', 'sit up', 'russian twist', 'core', 'hollow', 'leg raise', 'cable crunch'],
  forearms: ['forearm', 'wrist curl', 'reverse curl', 'grip'],
  traps: ['shrug', 'trap', 'face pull', 'upright row'],
  lats: ['lat', 'pullup', 'pulldown', 'pull up', 'pull down'],
  full_body: ['clean', 'snatch', 'thruster', 'burpee', 'full body'],
};

export function inferMuscleGroup(exerciseName: string): MuscleGroup {
  const lower = exerciseName.toLowerCase();

  // Prioritized matching
  for (const [muscle, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return muscle as MuscleGroup;
      }
    }
  }
  return 'full_body';
}

// ── WORKOUT TEXT PARSER ────────────────────────────────────

/**
 * Parse text like:
 * Monday: Chest + Triceps
 * - Bench Press 4x8
 * - Incline DB Press 3x10
 */
export function localWorkoutParser(text: string): ParsedWorkoutProgram {
  const days: ParsedWorkoutProgram['days'] = [];
  
  // Split by day headers
  const dayBlocks = text.split(/\n(?=\w.*:)/);
  
  for (const block of dayBlocks) {
    const lines = block.trim().split('\n').filter(Boolean);
    if (!lines.length) continue;
    
    // Parse day header: "Monday: Chest + Triceps" or "Push Day:"
    const headerMatch = lines[0].match(/^(.+?):\s*(.*)$/);
    if (!headerMatch) continue;
    
    const dayName = headerMatch[1].trim();
    const focus = headerMatch[2].trim() || undefined;
    const exercises: ParsedWorkoutProgram['days'][0]['exercises'] = [];
    
    // Parse exercises: "- Bench Press 4x8" or "Bench Press 4x8"
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim().replace(/^[-•*]\s*/, '');
      
      // Match: "Exercise Name 4x8" or "Exercise Name 4x8-12"
      const exMatch = line.match(/^(.+?)\s+(\d+)\s*[xX×]\s*([\d-]+)\s*$/);
      if (!exMatch) continue;
      
      const name = exMatch[1].trim();
      const sets = parseInt(exMatch[2], 10);
      const reps = exMatch[3];
      
      if (name && sets > 0) {
        exercises.push({
          name,
          sets,
          reps,
          muscle_group: inferMuscleGroup(name),
        });
      }
    }
    
    if (exercises.length > 0) {
      days.push({ day_name: dayName, focus, exercises });
    }
  }
  
  return { days };
}

export async function parseWorkoutText(
  text: string
): Promise<AIResponse<ParsedWorkoutProgram>> {
  // Always try local first
  const localResult = localWorkoutParser(text);
  
  // Calculate confidence: if most exercises have good muscle assignments
  const totalExercises = localResult.days.flatMap((d) => d.exercises).length;
  const confidence =
    totalExercises === 0
      ? 'low'
      : localResult.days.length >= 2
      ? 'high'
      : 'medium';
  
  // If confidence is low and AI is available, try AI
  if (confidence === 'low' && AI_AVAILABLE) {
    const prompt = `Parse this gym workout program text into a structured JSON format.
    
Text:
${text}

Return ONLY valid JSON with this exact structure:
{
  "days": [
    {
      "day_name": "Monday",
      "focus": "Chest + Triceps",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 4,
          "reps": "8",
          "muscle_group": "chest"
        }
      ]
    }
  ]
}

muscle_group must be one of: chest, back, shoulders, biceps, triceps, legs, quads, hamstrings, glutes, calves, core, forearms, traps, lats, full_body`;

    const { text: aiText, source } = await tryAI(prompt);
    if (aiText) {
      const parsed = safeJSONParser<ParsedWorkoutProgram>(aiText);
      if (parsed?.days?.length) {
        return { data: parsed, source, confidence: 'high' };
      }
    }
  }
  
  return {
    data: localResult,
    source: 'local',
    confidence,
  };
}

// ── FOOD TEXT PARSER ───────────────────────────────────────

// Basic Indian food database for local parsing
const INDIAN_FOOD_DB: Record<string, { cal: number; p: number; c: number; f: number; serving: number }> = {
  roti: { cal: 297, p: 9.9, c: 60.8, f: 3.7, serving: 30 },
  chapati: { cal: 297, p: 9.9, c: 60.8, f: 3.7, serving: 30 },
  dal: { cal: 116, p: 9, c: 20, f: 0.4, serving: 150 },
  rice: { cal: 130, p: 2.7, c: 28, f: 0.3, serving: 150 },
  'chicken breast': { cal: 165, p: 31, c: 0, f: 3.6, serving: 100 },
  paneer: { cal: 265, p: 18, c: 3.4, f: 20, serving: 100 },
  egg: { cal: 155, p: 13, c: 1.1, f: 11, serving: 50 },
  banana: { cal: 89, p: 1.1, c: 23, f: 0.3, serving: 118 },
  apple: { cal: 52, p: 0.3, c: 14, f: 0.2, serving: 182 },
  milk: { cal: 42, p: 3.4, c: 5, f: 1, serving: 240 },
  curd: { cal: 98, p: 11, c: 3.4, f: 4.3, serving: 200 },
  'peanut butter': { cal: 588, p: 25, c: 20, f: 50, serving: 32 },
  oats: { cal: 389, p: 17, c: 66, f: 7, serving: 80 },
  bread: { cal: 265, p: 9, c: 49, f: 3.2, serving: 30 },
  'dal fry': { cal: 130, p: 7, c: 18, f: 3.5, serving: 200 },
  rajma: { cal: 337, p: 22, c: 61, f: 1.4, serving: 150 },
  chickpea: { cal: 364, p: 19, c: 61, f: 6, serving: 150 },
  chhole: { cal: 364, p: 19, c: 61, f: 6, serving: 150 },
  idli: { cal: 39, p: 2, c: 7.9, f: 0.2, serving: 50 },
  dosa: { cal: 168, p: 3.7, c: 25, f: 5.9, serving: 100 },
  sambar: { cal: 44, p: 2.5, c: 7, f: 1.2, serving: 150 },
  poha: { cal: 110, p: 2.4, c: 23, f: 0.9, serving: 80 },
  upma: { cal: 135, p: 3, c: 22, f: 4, serving: 150 },
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  half: 0.5, 'a': 1, 'an': 1,
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
  
  // Try to match each food item in the database
  for (const [foodName, macro] of Object.entries(INDIAN_FOOD_DB)) {
    if (lower.includes(foodName)) {
      // Try to extract quantity before the food name
      const pattern = new RegExp(`(\\d+\\.?\\d*|\\w+)\\s*(?:piece|pieces|roti|bowl|cup|glass|plate|scoop)?\\s*${foodName}`, 'i');
      const match = lower.match(pattern);
      let quantity = 1;
      
      if (match) {
        quantity = parseQuantity(match[1]);
      }
      
      // Calculate based on serving size
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

export async function parseFoodText(
  text: string
): Promise<AIResponse<ParsedFoodEntry>> {
  const localResult = localFoodParser(text);
  
  // If local parser got results, return them
  if (localResult.confidence !== 'low') {
    return { data: localResult, source: 'local', confidence: localResult.confidence };
  }
  
  // Try AI fallback
  if (AI_AVAILABLE) {
    const prompt = `You are a nutrition expert for Indian food. Parse this meal description into macros.

Meal: "${text}"

Return ONLY valid JSON:
{
  "items": [
    {
      "name": "food name",
      "quantity_g": 150,
      "calories": 200,
      "protein": 10,
      "carbs": 30,
      "fat": 5
    }
  ],
  "total_calories": 200,
  "total_protein": 10,
  "total_carbs": 30,
  "total_fat": 5
}

Use standard Indian food nutrition values. Be precise.`;

    const { text: aiText, source } = await tryAI(prompt);
    if (aiText) {
      const parsed = safeJSONParser<Omit<ParsedFoodEntry, 'confidence'>>(aiText);
      if (parsed?.items?.length) {
        return {
          data: { ...parsed, confidence: 'medium' },
          source,
          confidence: 'medium',
        };
      }
    }
  }
  
  return { data: localResult, source: 'local', confidence: 'low' };
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
  weeklyStrengthTrend: number[], // last 4 weeks estimated 1RM
): OverloadSuggestion {
  if (!recentSets.length) {
    return { type: 'maintain', message: 'No data yet', detail: 'Log more sessions to get suggestions.' };
  }
  
  // Check if all sets hit upper rep range
  const allHitMax = recentSets.every((s) => s.reps >= s.target_reps_max);
  const avgRPE = recentSets.reduce((a, b) => a + (b.rpe ?? 7), 0) / recentSets.length;
  
  // Check strength trend (declining)
  const isStrengthDeclining =
    weeklyStrengthTrend.length >= 3 &&
    weeklyStrengthTrend[weeklyStrengthTrend.length - 1] <
      weeklyStrengthTrend[weeklyStrengthTrend.length - 2] &&
    weeklyStrengthTrend[weeklyStrengthTrend.length - 2] <
      weeklyStrengthTrend[weeklyStrengthTrend.length - 3];
  
  if (avgRPE > 9 && isStrengthDeclining) {
    return {
      type: 'deload',
      message: '⚠️ Deload Recommended',
      detail: 'RPE consistently >9 with declining strength. Take a deload week at 50-60% volume.',
    };
  }
  
  if (isStrengthDeclining) {
    return {
      type: 'reduce_volume',
      message: '📉 Reduce Volume',
      detail: 'Strength has been declining 3 weeks. Consider reducing volume by 20% and focusing on quality.',
    };
  }
  
  if (allHitMax && avgRPE <= 8) {
    return {
      type: 'increase_weight',
      message: '💪 Add Weight',
      detail: `All sets hit top of rep range at manageable RPE. Add 2.5kg next session.`,
    };
  }
  
  return {
    type: 'maintain',
    message: '✅ Keep Going',
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
  sleep_quality: number; // 1-5
  stress_level: number; // 1-5 (5=worst)
  mood: number; // 1-5 (5=best)
  soreness: number; // 1-5 (5=worst)
  energy_level: number; // 1-5 (5=best)
}): number {
  // Weighted formula (out of 100)
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
  
  // Plateau = weight fluctuation <0.5kg over 14 days
  if (range < 0.5) {
    return {
      detected: true,
      days: 14,
      message: `Weight has been within ${range.toFixed(1)}kg range for 14 days. Consider adjusting calories.`,
    };
  }
  
  return { detected: false, days: 0 };
}

export { AI_AVAILABLE };
