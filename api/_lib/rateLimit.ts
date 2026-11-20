import crypto from 'node:crypto';
import { getUpstashConfig } from './env.js';
import { getRtdb, hasFirebaseAdmin } from './firebaseAdmin.js';

/** Soft in-memory rate limit (best-effort across warm serverless instances). */
const rateLimitMap = new Map<string, number>();

export function checkRateLimit(key: string, windowMs = 10000): boolean {
  const now = Date.now();
  const lastTime = rateLimitMap.get(key) || 0;
  if (now - lastTime < windowMs) {
    return false;
  }
  rateLimitMap.set(key, now);
  return true;
}

export interface ExternalRateLimitParams {
  key: string;
  limit: number;
  windowMs: number;
  rtdb?: ReturnType<typeof getRtdb>;
}

export interface ExternalRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  backend: 'upstash' | 'rtdb' | 'memory';
}

function hashRateLimitKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

let lastRateLimitCleanupAt = 0;

/**
 * Removes RTDB rateLimits entries older than maxAgeMs (default 1 hour) in bounded batches.
 */
export async function cleanupExpiredRateLimits(
  rtdb: ReturnType<typeof getRtdb>,
  now = Date.now(),
  maxAgeMs = 60 * 60 * 1000
): Promise<number> {
  try {
    const snap = await rtdb.ref('rateLimits').limitToFirst(100).get();
    if (!snap.exists()) return 0;

    const entries = snap.val() as Record<string, { updatedAt?: number; resetAt?: number } | null>;
    const removals: Record<string, null> = {};

    for (const [key, item] of Object.entries(entries || {})) {
      if (!item || typeof item !== 'object') {
        removals[`rateLimits/${key}`] = null;
        continue;
      }
      const refTimestamp =
        typeof item.updatedAt === 'number'
          ? item.updatedAt
          : typeof item.resetAt === 'number'
          ? item.resetAt
          : 0;
      if (refTimestamp + maxAgeMs <= now) {
        removals[`rateLimits/${key}`] = null;
      }
    }

    const removedCount = Object.keys(removals).length;
    if (removedCount > 0) {
      await rtdb.ref().update(removals);
    }
    return removedCount;
  } catch {
    return 0;
  }
}

/**
 * Shared serverless-safe rate limiter backed by Upstash Redis REST (if env vars are set)
 * or Firebase RTDB atomic transactions (rateLimits/{hashedKey}).
 */
export async function checkExternalRateLimit(
  params: ExternalRateLimitParams
): Promise<ExternalRateLimitResult> {
  const now = Date.now();
  const safeKey = hashRateLimitKey(params.key);
  const upstash = getUpstashConfig();

  if (upstash) {
    try {
      const redisKey = `rl:${safeKey}`;
      const res = await fetch(`${upstash.url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstash.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['PEXPIRE', redisKey, String(params.windowMs), 'NX'],
          ['PTTL', redisKey],
        ]),
      });

      if (res.ok) {
        const data = (await res.json()) as Array<{ result?: number }>;
        const count = Number(data?.[0]?.result || 1);
        const ttl = Number(data?.[2]?.result || params.windowMs);
        const resetAt = now + (ttl > 0 ? ttl : params.windowMs);
        return {
          allowed: count <= params.limit,
          remaining: Math.max(0, params.limit - count),
          resetAt,
          backend: 'upstash',
        };
      }
    } catch {
      // Fall back to RTDB below if Upstash temporarily unreachable
    }
  }

  const db = params.rtdb || (hasFirebaseAdmin() ? getRtdb() : null);
  if (db) {
    try {
      const ref = db.ref(`rateLimits/${safeKey}`);
      let nextResetAt = now + params.windowMs;
      let nextCount = 0;

      const txResult = await ref.transaction((current: any) => {
        const currReset = Number(current?.resetAt || 0);
        if (!current || typeof current !== 'object' || currReset <= now) {
          nextCount = 1;
          nextResetAt = now + params.windowMs;
          return { count: 1, resetAt: nextResetAt, updatedAt: now };
        }
        const currCount = Number(current.count || 0);
        nextResetAt = currReset;
        if (currCount >= params.limit) {
          nextCount = currCount;
          return; // Abort transaction when limit exceeded
        }
        nextCount = currCount + 1;
        return { count: nextCount, resetAt: currReset, updatedAt: now };
      });

      if (now - lastRateLimitCleanupAt >= 5 * 60 * 1000) {
        lastRateLimitCleanupAt = now;
        await cleanupExpiredRateLimits(db, now);
      }

      return {
        allowed: Boolean(txResult?.committed),
        remaining: txResult?.committed ? Math.max(0, params.limit - nextCount) : 0,
        resetAt: nextResetAt,
        backend: 'rtdb',
      };
    } catch {
      // Fallback handled below
    }
  }

  // Only used if neither Redis nor Firebase Admin RTDB is available (e.g., offline unit test)
  return {
    allowed: checkRateLimit(`fallback:${safeKey}`, Math.min(params.windowMs, 1000)),
    remaining: 1,
    resetAt: now + params.windowMs,
    backend: 'memory',
  };
}
