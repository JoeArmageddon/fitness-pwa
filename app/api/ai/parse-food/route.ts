// ============================================================
// API ROUTE: /api/ai/parse-food
// Server-side so GEMINI_API_KEY / GROQ_API_KEY are available
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

async function callGemini(text: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a precise nutrition expert specializing in Indian food.
Parse this meal description and return ONLY valid JSON. No markdown, no explanation.

Meal: "${text}"

Return this exact JSON structure:
{
  "items": [
    {
      "name": "food name",
      "quantity_g": 150,
      "calories": 200,
      "protein": 10.5,
      "carbs": 30.2,
      "fat": 5.1
    }
  ],
  "total_calories": 200,
  "total_protein": 10.5,
  "total_carbs": 30.2,
  "total_fat": 5.1,
  "confidence": "high"
}

Rules:
- Use accurate ICMR/USDA nutrition values for Indian foods
- For rotis: ~100 kcal, 3g protein, 18g carbs, 2g fat each (30g each)
- For dal fry (200g): ~260 kcal, 14g protein, 36g fat, 7g fat
- For rice (1 cup cooked, 150g): ~195 kcal, 4g protein, 42g carbs, 0.5g fat
- Be precise with quantities based on context clues
- confidence must be "high", "medium", or "low"`
            }]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch { return null; }
}

async function callGroq(text: string): Promise<string | null> {
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
            content: 'You are a precise nutrition expert for Indian food. Return ONLY valid JSON. No markdown, no backticks, no explanation.'
          },
          {
            role: 'user',
            content: `Parse this Indian meal into nutrition data: "${text}"

Return ONLY this JSON:
{
  "items": [{"name": "string", "quantity_g": number, "calories": number, "protein": number, "carbs": number, "fat": number}],
  "total_calories": number,
  "total_protein": number,
  "total_carbs": number,
  "total_fat": number,
  "confidence": "high"
}

Use accurate values: roti=100kcal/3p/18c/2f per piece, dal=130kcal/7p/18c/3.5f per 150g, rice=195kcal/4p/42c/0.5f per 150g cooked`
          }
        ],
        temperature: 0.1,
        max_tokens: 512,
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}

function safeJSON<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { return null; }
    }
    return null;
  }
}

// Local Indian food fallback with real macros
const QUICK_DB: Record<string, { cal: number; p: number; c: number; f: number; serving: number; unit: string }> = {
  'roti':       { cal: 100, p: 3,    c: 18,   f: 2,    serving: 30,  unit: 'piece' },
  'chapati':    { cal: 100, p: 3,    c: 18,   f: 2,    serving: 30,  unit: 'piece' },
  'paratha':    { cal: 200, p: 4.5,  c: 28,   f: 7,    serving: 60,  unit: 'piece' },
  'rice':       { cal: 195, p: 4,    c: 42,   f: 0.5,  serving: 150, unit: 'cup' },
  'dal':        { cal: 195, p: 10.5, c: 27,   f: 5,    serving: 150, unit: 'bowl' },
  'dal fry':    { cal: 260, p: 14,   c: 36,   f: 7,    serving: 200, unit: 'bowl' },
  'rajma':      { cal: 246, p: 13.5, c: 41,   f: 1,    serving: 150, unit: 'bowl' },
  'chole':      { cal: 246, p: 13.5, c: 41,   f: 1,    serving: 150, unit: 'bowl' },
  'paneer':     { cal: 265, p: 18,   c: 3.4,  f: 20,   serving: 100, unit: '100g' },
  'chicken':    { cal: 248, p: 46.5, c: 0,    f: 5.4,  serving: 150, unit: 'piece' },
  'egg':        { cal: 78,  p: 6.5,  c: 0.6,  f: 5,    serving: 50,  unit: 'piece' },
  'milk':       { cal: 100, p: 8,    c: 12,   f: 2.4,  serving: 240, unit: 'glass' },
  'curd':       { cal: 196, p: 22,   c: 6.8,  f: 8.6,  serving: 200, unit: 'bowl' },
  'dahi':       { cal: 196, p: 22,   c: 6.8,  f: 8.6,  serving: 200, unit: 'bowl' },
  'idli':       { cal: 39,  p: 2,    c: 7.9,  f: 0.2,  serving: 50,  unit: 'piece' },
  'dosa':       { cal: 168, p: 3.7,  c: 25,   f: 5.9,  serving: 100, unit: 'piece' },
  'sambar':     { cal: 88,  p: 5,    c: 14,   f: 2.4,  serving: 200, unit: 'bowl' },
  'poha':       { cal: 165, p: 3.6,  c: 34.5, f: 1.4,  serving: 150, unit: 'plate' },
  'oats':       { cal: 311, p: 13.6, c: 52.8, f: 5.6,  serving: 80,  unit: 'bowl' },
  'banana':     { cal: 105, p: 1.3,  c: 27,   f: 0.4,  serving: 118, unit: 'piece' },
  'apple':      { cal: 95,  p: 0.5,  c: 25,   f: 0.3,  serving: 182, unit: 'piece' },
  'bread':      { cal: 80,  p: 2.7,  c: 14.7, f: 1,    serving: 30,  unit: 'slice' },
  'peanut butter': { cal: 188, p: 8, c: 6.4,  f: 16,   serving: 32,  unit: 'tbsp' },
  'whey':       { cal: 120, p: 24,   c: 2.1,  f: 1.5,  serving: 30,  unit: 'scoop' },
  'almonds':    { cal: 162, p: 5.9,  c: 6.1,  f: 14,   serving: 28,  unit: 'handful' },
  'ghee':       { cal: 90,  p: 0,    c: 0,    f: 10,   serving: 10,  unit: 'tsp' },
};

function localParse(text: string) {
  const lower = text.toLowerCase();
  const items: Array<{ name: string; quantity_g: number; calories: number; protein: number; carbs: number; fat: number }> = [];
  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;

  for (const [food, macro] of Object.entries(QUICK_DB)) {
    if (!lower.includes(food)) continue;

    // Extract quantity before food name
    const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:pieces?|rotis?|cups?|bowls?|glasses?|plates?|scoops?|slices?|tbsp|tsp|g|kg)?\\s*(?:of\\s+)?${food.replace(' ', '\\s+')}`, 'i');
    const match = lower.match(pattern);
    let qty = 1;
    if (match) qty = parseFloat(match[1]);
    // Also check words before
    const wordsBefore = lower.substring(Math.max(0, lower.indexOf(food) - 20), lower.indexOf(food));
    const numWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, half: 0.5 };
    for (const [w, v] of Object.entries(numWords)) {
      if (wordsBefore.includes(w)) qty = v;
    }

    const grams = macro.serving * qty;
    const factor = grams / 100;
    const cal = Math.round(macro.cal * factor);
    const p = Math.round(macro.p * factor * 10) / 10;
    const c = Math.round(macro.c * factor * 10) / 10;
    const f = Math.round(macro.f * factor * 10) / 10;

    items.push({ name: `${qty > 1 ? qty + ' ' : ''}${food}`, quantity_g: Math.round(grams), calories: cal, protein: p, carbs: c, fat: f });
    totalCal += cal; totalP += p; totalC += c; totalF += f;
  }

  return {
    items,
    total_calories: Math.round(totalCal),
    total_protein: Math.round(totalP * 10) / 10,
    total_carbs: Math.round(totalC * 10) / 10,
    total_fat: Math.round(totalF * 10) / 10,
    confidence: items.length > 0 ? 'medium' : 'low' as 'medium' | 'low',
  };
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  // Try Gemini first
  const geminiRaw = await callGemini(text);
  if (geminiRaw) {
    const parsed = safeJSON<any>(geminiRaw);
    if (parsed?.items?.length && parsed.total_calories > 0) {
      return NextResponse.json({ ...parsed, source: 'gemini' });
    }
  }

  // Try Groq
  const groqRaw = await callGroq(text);
  if (groqRaw) {
    const parsed = safeJSON<any>(groqRaw);
    if (parsed?.items?.length && parsed.total_calories > 0) {
      return NextResponse.json({ ...parsed, source: 'groq' });
    }
  }

  // Local fallback
  const local = localParse(text);
  return NextResponse.json({ ...local, source: 'local' });
}