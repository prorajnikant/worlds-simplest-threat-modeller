import type { RateLimitResult } from "@threat-modeller/core";

interface Entry { count: number; windowStart: number }

const store = new Map<string, Entry>();
const WINDOW_MS = 24 * 60 * 60 * 1000;
const LIMIT = parseInt(process.env["RATE_LIMIT_FREE_TIER"] ?? "3", 10);
let calls = 0;

export function checkRateLimit(id: string): RateLimitResult {
  const now = Date.now();
  if (++calls % 1000 === 0) {
    for (const [k, v] of store) if (now - v.windowStart > WINDOW_MS) store.delete(k);
  }
  const e = store.get(id);
  const expired = !e || now - e.windowStart > WINDOW_MS;
  if (expired) {
    store.set(id, { count: 1, windowStart: now });
    return { allowed: true, remaining: LIMIT - 1, resetAt: Math.floor((now + WINDOW_MS) / 1000), limit: LIMIT };
  }
  if (e!.count >= LIMIT)
    return { allowed: false, remaining: 0, resetAt: Math.floor((e!.windowStart + WINDOW_MS) / 1000), limit: LIMIT };
  e!.count++;
  return { allowed: true, remaining: LIMIT - e!.count, resetAt: Math.floor((e!.windowStart + WINDOW_MS) / 1000), limit: LIMIT };
}
