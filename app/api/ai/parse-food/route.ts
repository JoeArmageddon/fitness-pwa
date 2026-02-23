import { NextRequest, NextResponse } from 'next/server';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROQ_KEY   = process.env.GROQ_API_KEY;

// ── Compact prompt — short enough to stay within free tier ─
const PROMPT = (text: string) => `Parse this food into JSON macros. Rules:
- Multi-word names = single food ("honey chili potato" = 1 item)
- Respect exact weights if given ("100g" means quantity_g:100)
- Scale macros correctly: value = (per100g × quantity) / 100
- Return ONLY raw JSON, no markdown, no explanation

Return this exact structure:
{"items":[{"name":"food name","quantity_g":100,"calories":185,"protein":22,"carbs":2,"fat":10}],"total_calories":185,"total_protein":22,"total_carbs":2,"total_fat":10}

Food: "${text}"`;

function extractJSON(raw: string): any | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^```json\s*/im,'').replace(/^```\s*/im,'').replace(/```\s*$/im,'').trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function isValid(d: any): boolean {
  return d && Array.isArray(d.items) && d.items.length > 0 &&
    d.items.every((i: any) => typeof i.name === 'string' && typeof i.calories === 'number' && i.calories > 0) &&
    typeof d.total_calories === 'number' && d.total_calories > 0;
}

function rounded(d: any): any {
  return {
    ...d,
    total_calories: Math.round(d.total_calories),
    total_protein:  Math.round(d.total_protein * 10) / 10,
    total_carbs:    Math.round(d.total_carbs * 10) / 10,
    total_fat:      Math.round(d.total_fat * 10) / 10,
    items: d.items.map((i: any) => ({
      ...i,
      calories: Math.round(i.calories),
      protein:  Math.round(i.protein * 10) / 10,
      carbs:    Math.round(i.carbs * 10) / 10,
      fat:      Math.round(i.fat * 10) / 10,
    })),
  };
}

async function callGemini(text: string): Promise<{ data: any; error?: string }> {
  if (!GEMINI_KEY) return { data: null, error: 'GEMINI_API_KEY not set' };
  try {
    // Use flash-lite — higher free quota than flash
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT(text) }] }],
          generationConfig: { temperature: 0.0, maxOutputTokens: 512 },
        }),
      }
    );
    const body = await res.json();
    if (!res.ok) return { data: null, error: `Gemini ${res.status}: ${body?.error?.message ?? JSON.stringify(body).slice(0,150)}` };
    const raw = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return { data: null, error: 'Gemini empty response' };
    const parsed = extractJSON(raw);
    if (!isValid(parsed)) return { data: null, error: `Gemini bad JSON: ${raw.slice(0,150)}` };
    return { data: rounded(parsed) };
  } catch (e: any) {
    return { data: null, error: `Gemini: ${e.message}` };
  }
}

async function callGroq(text: string): Promise<{ data: any; error?: string }> {
  if (!GROQ_KEY) return { data: null, error: 'GROQ_API_KEY not set' };
  try {
    // No response_format constraint — just ask for JSON in the message
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: PROMPT(text) },
        ],
        temperature: 0.0,
        max_tokens: 512,
      }),
    });
    const body = await res.json();
    if (!res.ok) return { data: null, error: `Groq ${res.status}: ${body?.error?.message ?? JSON.stringify(body).slice(0,150)}` };
    const raw = body?.choices?.[0]?.message?.content;
    if (!raw) return { data: null, error: 'Groq empty response' };
    const parsed = extractJSON(raw);
    if (!isValid(parsed)) return { data: null, error: `Groq bad JSON: ${raw.slice(0,150)}` };
    return { data: rounded(parsed) };
  } catch (e: any) {
    return { data: null, error: `Groq: ${e.message}` };
  }
}

export async function POST(req: NextRequest) {
  let text = '';
  try { text = (await req.json()).text ?? ''; }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  if (!text.trim()) return NextResponse.json({ error: 'No food text provided' }, { status: 400 });

  const errors: string[] = [];

  if (GEMINI_KEY) {
    const r = await callGemini(text);
    if (r.data) return NextResponse.json({ ...r.data, source: 'gemini' });
    errors.push(r.error!);
  } else {
    errors.push('GEMINI_API_KEY not configured');
  }

  if (GROQ_KEY) {
    const r = await callGroq(text);
    if (r.data) return NextResponse.json({ ...r.data, source: 'groq' });
    errors.push(r.error!);
  } else {
    errors.push('GROQ_API_KEY not configured');
  }

  const noKeys = !GEMINI_KEY && !GROQ_KEY;
  return NextResponse.json({
    error: noKeys
      ? 'No AI API keys found. Add GEMINI_API_KEY to .env.local.'
      : `All AI providers failed: ${errors.join(' | ')}`,
    noKeys,
    setup: noKeys ? [
      '1. Go to aistudio.google.com/app/apikey',
      '2. Click "Create API Key" (free)',
      '3. Add to .env.local: GEMINI_API_KEY=AIza...your-key',
      '4. Restart: npm run dev',
    ] : null,
    errors,
  }, { status: 503 });
}