import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { rateLimits } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { RateLimitError } from "./errors";

export type Limit = { max: number; windowSeconds: number };

/** Limits for each action. Per IP is looser because many learners may share one IP (a training centre). */
export const LIMITS = {
  signInPerEmail: { max: 5, windowSeconds: 15 * 60 },
  signInPerIp: { max: 30, windowSeconds: 15 * 60 },
  signUpPerEmail: { max: 3, windowSeconds: 60 * 60 },
  signUpPerIp: { max: 10, windowSeconds: 60 * 60 },
  helpRequestPerIp: { max: 10, windowSeconds: 60 * 60 },
  // Passkeys: starting a ceremony is cheap, so allow more; finishing is where guessing would happen.
  passkeyStartPerIp: { max: 30, windowSeconds: 15 * 60 },
  passkeyFinishPerIp: { max: 30, windowSeconds: 15 * 60 },
} satisfies Record<string, Limit>;

/** Rate-limit keys never contain personal data in clear text. */
export function hashKeyPart(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("base64url").slice(0, 32);
}

function windowStart(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

/**
 * Count one hit for `key` in the current window.
 * Returns whether the hit is allowed and how long until the window resets.
 * Uses a single atomic upsert, so parallel requests are counted correctly.
 */
export async function hit(
  db: Db,
  key: string,
  limit: Limit,
  now: Date = new Date(),
): Promise<{ allowed: boolean; count: number; retryAfterSeconds: number }> {
  const start = windowStart(now, limit.windowSeconds);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: start, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  const count = row?.count ?? Number.POSITIVE_INFINITY;
  const resetAt = start.getTime() + limit.windowSeconds * 1000;
  return {
    allowed: count <= limit.max,
    count,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
}

/**
 * Count a hit on every key and throw RateLimitError if any is over its limit.
 * All keys are counted even when one fails, so an attacker cannot dodge the
 * per-email limit by tripping the per-IP one first.
 */
export async function enforce(
  db: Db,
  checks: { key: string; limit: Limit }[],
  now: Date = new Date(),
): Promise<void> {
  const results = await Promise.all(checks.map(({ key, limit }) => hit(db, key, limit, now)));
  const blocked = results.filter((r) => !r.allowed);
  if (blocked.length > 0) {
    throw new RateLimitError(Math.max(...blocked.map((r) => r.retryAfterSeconds)));
  }
}

/**
 * Delete expired windows.
 * TODO: call this from a cron route protected by CRON_SECRET (not built yet).
 */
export async function pruneRateLimits(db: Db, olderThan: Date): Promise<number> {
  const deleted = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, olderThan))
    .returning({ id: rateLimits.id });
  return deleted.length;
}
