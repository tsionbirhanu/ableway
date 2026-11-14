import { timingSafeEqual } from "node:crypto";
import { UnauthorizedError } from "@/lib/auth/errors";
import { getEnv } from "@/lib/env";

/** Constant-time string comparison. False for a missing value. */
export function safeEqual(received: string | null | undefined, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Cron routes: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * Anything else is 401.
 */
export function requireCronSecret(request: Request): void {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!safeEqual(supplied, getEnv().CRON_SECRET)) throw new UnauthorizedError("Unauthorized");
}
