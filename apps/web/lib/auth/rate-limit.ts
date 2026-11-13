/**
 * Fixed-window rate limiter.
 *
 * Uses Upstash Redis (REST) when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set, so limits hold across serverless
 * instances. Falls back to an in-process Map for local development — that
 * fallback is per-instance and must not be relied on in production.
 */

export const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

// ---------------------------------------------------------------- in-memory
const memory = new Map<string, { count: number; resetAt: number }>();

function memCheck(key: string, max: number): RateLimitResult {
  const now = Date.now();
  const r = memory.get(key);
  if (!r || now > r.resetAt || r.count < max) return { allowed: true };
  return { allowed: false, retryAfterSeconds: Math.ceil((r.resetAt - now) / 1000) };
}

function memRecord(key: string): void {
  const now = Date.now();
  const r = memory.get(key);
  if (!r || now > r.resetAt) memory.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else r.count += 1;
}

// ------------------------------------------------------------------ upstash
function upstash(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function pipeline(cmds: (string | number)[][]): Promise<{ result: unknown }[]> {
  const cfg = upstash()!;
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  return res.json();
}

const redisKey = (key: string) => `argus:rl:${key}`;

// ------------------------------------------------------------------- public
export async function checkRateLimit(key: string, maxAttempts: number = MAX_ATTEMPTS): Promise<RateLimitResult> {
  if (!upstash()) return memCheck(key, maxAttempts);
  try {
    const [count, ttl] = await pipeline([
      ["GET", redisKey(key)],
      ["PTTL", redisKey(key)],
    ]);
    const n = Number(count?.result ?? 0);
    if (n < maxAttempts) return { allowed: true };
    const ms = Number(ttl?.result ?? WINDOW_MS);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((ms > 0 ? ms : WINDOW_MS) / 1000)) };
  } catch (err) {
    // Fail open on limiter outages, but loudly.
    console.error("rate-limit check failed, falling back to memory:", err);
    return memCheck(key, maxAttempts);
  }
}

/** Count one attempt against `key` (for login this is called only on failures). */
export async function recordFailedAttempt(key: string): Promise<void> {
  if (!upstash()) return memRecord(key);
  try {
    await pipeline([
      ["INCR", redisKey(key)],
      ["PEXPIRE", redisKey(key), WINDOW_MS, "NX"],
    ]);
  } catch (err) {
    console.error("rate-limit record failed, falling back to memory:", err);
    memRecord(key);
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  memory.delete(key);
  if (upstash()) await pipeline([["DEL", redisKey(key)]]).catch(() => {});
}
