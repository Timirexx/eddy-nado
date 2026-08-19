/**
 * Rate limiting for /api/chat, which is public and spends real tokens per call.
 *
 * Two backends, chosen at runtime:
 *
 *   Durable  — any Upstash-compatible Redis (Vercel KV, Upstash) reachable via
 *              KV_REST_API_URL + KV_REST_API_TOKEN. Counts are shared across
 *              every serverless instance, so the limit means what it says.
 *   In-memory — the fallback. Serverless spreads traffic over instances that
 *              come and go, so each holds its own counter and the effective
 *              limit is looser than configured. It still throttles a single
 *              caller hammering a warm instance, which is the common abuse
 *              shape, and it needs no provisioning.
 *
 * Deliberately no npm dependency: the durable path is a plain fetch against the
 * REST API, so adding KV later is an environment-variable change and nothing
 * else. If Redis errors or times out, requests are allowed through rather than
 * failing closed — a rate limiter that takes the whole assistant down with it
 * is worse than the abuse it prevents.
 */

const WINDOW_SECONDS = Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 300);
const MAX_PER_WINDOW = Number(process.env.RATE_LIMIT_MAX || 15);

// Optional ceiling on total requests per UTC day across all callers, so a
// determined attacker rotating IPs still can't run up an unbounded bill.
// Unset means no global cap.
const DAILY_GLOBAL_MAX = Number(process.env.RATE_LIMIT_DAILY_GLOBAL || 0);

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const useDurableStore = Boolean(KV_URL && KV_TOKEN);

const memoryCounters = new Map();

export function clientKey(req) {
  // Vercel terminates TLS upstream, so the socket address is a proxy. The
  // left-most x-forwarded-for entry is the original client; it is spoofable in
  // general but Vercel's proxy rewrites it, so it is trustworthy here.
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded?.[0]) ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';
  return String(ip).trim();
}

/**
 * @returns {Promise<{allowed: boolean, retryAfter: number, reason?: string}>}
 */
export async function checkRateLimit(req) {
  const key = clientKey(req);
  const window = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);

  const perClient = await increment(`eddy:rl:${key}:${window}`, WINDOW_SECONDS);
  if (perClient > MAX_PER_WINDOW) {
    return {
      allowed: false,
      retryAfter: secondsUntilWindowEnd(WINDOW_SECONDS),
      reason: `Rate limit reached — ${MAX_PER_WINDOW} messages per ${describeWindow(
        WINDOW_SECONDS,
      )}. Try again shortly.`,
    };
  }

  if (DAILY_GLOBAL_MAX > 0) {
    const day = new Date().toISOString().slice(0, 10);
    const total = await increment(`eddy:rl:global:${day}`, 86400);
    if (total > DAILY_GLOBAL_MAX) {
      return {
        allowed: false,
        retryAfter: secondsUntilUtcMidnight(),
        reason: 'The assistant has hit its daily usage cap. Try again tomorrow.',
      };
    }
  }

  return { allowed: true, retryAfter: 0 };
}

async function increment(key, ttlSeconds) {
  if (useDurableStore) {
    try {
      return await incrementDurable(key, ttlSeconds);
    } catch (err) {
      console.error('[eddy] rate-limit store unavailable, falling back:', err.message);
      // Fall through to the in-memory counter rather than blocking traffic.
    }
  }
  return incrementInMemory(key, ttlSeconds);
}

async function incrementDurable(key, ttlSeconds) {
  // EXPIRE ... NX sets the TTL only if the key has none, so the window starts
  // at the first request and isn't pushed forward by later ones.
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${KV_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, String(ttlSeconds), 'NX'],
    ]),
    signal: AbortSignal.timeout(2000),
  });

  if (!res.ok) throw new Error(`store returned ${res.status}`);

  const body = await res.json();
  const count = Number(body?.[0]?.result);
  if (!Number.isFinite(count)) throw new Error('unexpected store response');
  return count;
}

function incrementInMemory(key, ttlSeconds) {
  const now = Date.now();

  // Sweep expired keys so a long-lived warm instance doesn't grow unbounded.
  if (memoryCounters.size > 5000) {
    for (const [k, entry] of memoryCounters) {
      if (entry.expiresAt <= now) memoryCounters.delete(k);
    }
  }

  const existing = memoryCounters.get(key);
  if (!existing || existing.expiresAt <= now) {
    memoryCounters.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

function describeWindow(seconds) {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? 'minute' : `${minutes} minutes`;
}

function secondsUntilWindowEnd(windowSeconds) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return windowSeconds - (nowSeconds % windowSeconds);
}

function secondsUntilUtcMidnight() {
  const now = new Date();
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

export const rateLimitBackend = useDurableStore ? 'durable' : 'in-memory';
