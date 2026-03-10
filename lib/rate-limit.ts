// ============================================================
// IN-MEMORY RATE LIMITER
// Scoped per user per action. Resets on server restart (fine for MVP).
// For production scale: replace store with Upstash Redis.
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number; // unix ms timestamp
}

// Module-level Map survives across requests within the same serverless instance
const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

/**
 * Check and increment a sliding-window rate limit.
 *
 * @param key      Unique identifier e.g. "parse-food:<userId>"
 * @param limit    Max calls per window. Pass Infinity for unlimited (Pro plan).
 * @param windowMs Window duration in ms. Default: 24 hours.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 24 * 60 * 60 * 1000
): RateLimitResult {
  // Unlimited plan — skip all tracking
  if (!isFinite(limit)) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const now = Date.now();
  const entry = store.get(key);

  // No entry or window has expired — start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  // Over limit
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment and allow
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}
