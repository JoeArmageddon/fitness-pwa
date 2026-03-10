// ============================================================
// INPUT SANITIZATION - Security utility
// Used in all API routes and before any AI or DB calls
// ============================================================

const MAX_TEXT_LENGTH = 4000;
const MAX_NAME_LENGTH = 100;
const MAX_QUERY_LENGTH = 200;

/** Strip HTML tags, script blocks, and dangerous characters */
function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

/** Remove null bytes and control characters (except newlines/tabs) */
function stripControlChars(input: string): string {
  // Allow \n (10), \r (13), \t (9), regular printable ASCII + Unicode
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/** Collapse excessive whitespace while preserving meaningful newlines */
function normalizeWhitespace(input: string): string {
  return input
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n') // max 3 consecutive newlines
    .trim();
}

/** Sanitize any general text input (workout descriptions, food text, notes) */
export function sanitizeText(input: unknown, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof input !== 'string') return '';
  let result = stripHtml(input);
  result = stripControlChars(result);
  result = normalizeWhitespace(result);
  return result.slice(0, maxLength);
}

/** Sanitize short name fields (program names, food names, display names) */
export function sanitizeName(input: unknown): string {
  if (typeof input !== 'string') return '';
  let result = stripHtml(input);
  result = stripControlChars(result);
  result = result.replace(/\n/g, ' ').trim();
  // Only allow alphanumeric, spaces, hyphens, parentheses, apostrophes, dots, commas
  result = result.replace(/[^a-zA-Z0-9\s\-()'.,:+&/àáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿÀ-ÖØ-öø-ÿ]/g, '');
  return result.slice(0, MAX_NAME_LENGTH);
}

/** Sanitize search query strings */
export function sanitizeQuery(input: unknown): string {
  if (typeof input !== 'string') return '';
  let result = stripHtml(input);
  result = stripControlChars(result);
  result = result.replace(/\n/g, ' ').trim();
  return result.slice(0, MAX_QUERY_LENGTH);
}

/** Sanitize and clamp a numeric value within min/max */
export function sanitizeNumber(
  input: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n = typeof input === 'string' ? parseFloat(input) : Number(input);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Validate that a string is a known enum value */
export function sanitizeEnum<T extends string>(
  input: unknown,
  allowed: T[],
  fallback: T
): T {
  if (typeof input !== 'string') return fallback;
  return (allowed as string[]).includes(input) ? (input as T) : fallback;
}

/** Validate a date string is a valid YYYY-MM-DD format */
export function sanitizeDate(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const match = input.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return input;
}

/** Validate AI JSON output has expected shape (prevents prompt injection via JSON) */
export function validateParsedFood(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return false;
  if (typeof obj.total_calories !== 'number') return false;
  if (typeof obj.total_protein !== 'number') return false;
  for (const item of obj.items as unknown[]) {
    if (typeof item !== 'object' || !item) return false;
    const it = item as Record<string, unknown>;
    if (typeof it.name !== 'string') return false;
    if (typeof it.calories !== 'number') return false;
    if (typeof it.protein !== 'number') return false;
    // Guard against unrealistic values (injection attempt)
    if ((it.calories as number) > 10000 || (it.calories as number) < 0) return false;
    if ((it.protein as number) > 1000 || (it.protein as number) < 0) return false;
  }
  return true;
}

export function validateParsedWorkout(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.days)) return false;
  for (const day of obj.days as unknown[]) {
    if (typeof day !== 'object' || !day) return false;
    const d = day as Record<string, unknown>;
    if (typeof d.day_name !== 'string') return false;
    if (!Array.isArray(d.exercises)) return false;
    if (d.exercises.length > 30) return false; // guard against huge payloads
  }
  return obj.days.length <= 14; // max 14 day program
}
