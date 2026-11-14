import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  errorResponse,
  ForbiddenError,
  PayloadTooLargeError,
  RateLimitError,
} from "@/lib/auth/errors";
import { DEFAULT_MAX_JSON_BYTES, setBodyLimit } from "@/lib/auth/params";
import { enforce, hashKeyPart, LIMITS, type Limit } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/request-ip";
import { getDb } from "@/lib/db/client";
import { logger } from "@/lib/log";

/**
 * The one wrapper every API route uses (a unit test checks this):
 *
 *   export const POST = withApi({ rateLimit: "write" }, async (request) => { ... });
 *
 * In order, it:
 * 1. CSRF: refuses state-changing requests (POST, PUT, PATCH, DELETE) sent
 *    by another site. Browsers send Origin and Sec-Fetch-Site on such
 *    requests; if either says another site, the request is refused (403).
 *    Requests with neither header come from non-browser clients, which
 *    carry no session cookie to abuse.
 * 2. Size: refuses bodies over `maxBodyBytes` (413). readJson and
 *    readBodyBytes enforce the same limit while reading, so a missing or
 *    false Content-Length does not help.
 * 3. Rate limit: counts the request per IP, and per user when signed in,
 *    for the route's category (429 with Retry-After). If the counter store
 *    (Postgres) is unreachable, this general limit fails open and logs an
 *    error; the targeted limits on sign-in, sign-up, link codes, help
 *    requests and speech fail closed.
 * 4. Errors: HttpError and ZodError become plain-language JSON; anything else
 *    is logged without personal data and returned as a generic 500.
 * API responses are never cached by shared caches (Cache-Control: no-store
 * unless the route set its own).
 */

export type RateLimitCategory =
  "read" | "write" | "assistant" | "export" | "accountDelete" | "telegramWebhook" | "cron";

const CATEGORY_LIMITS: Record<RateLimitCategory, { ip: Limit; user?: Limit }> = {
  read: { ip: LIMITS.apiReadPerIp, user: LIMITS.apiReadPerUser },
  write: { ip: LIMITS.apiWritePerIp, user: LIMITS.apiWritePerUser },
  assistant: { ip: LIMITS.assistantPerIp, user: LIMITS.assistantPerUser },
  export: { ip: LIMITS.apiWritePerIp, user: LIMITS.exportPerUser },
  accountDelete: { ip: LIMITS.apiWritePerIp, user: LIMITS.accountDeletePerUser },
  telegramWebhook: { ip: LIMITS.telegramWebhookPerIp },
  cron: { ip: LIMITS.cronPerIp },
};

export type ApiOptions = {
  /** Rate-limit category. Defaults to "read" for GET/HEAD and "write" otherwise. */
  rateLimit?: RateLimitCategory;
  /** Largest request body accepted, in bytes. Default 64 KiB. */
  maxBodyBytes?: number;
  /** The error to throw when the body is too large (default: PayloadTooLargeError, 413). */
  tooLarge?: () => Error;
  /**
   * Same-origin check for state-changing methods. Default true. Only routes
   * authenticated by a shared secret header (Telegram webhook, cron) set false.
   */
  csrf?: boolean;
};

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** True if a browser told us this request came from another site. */
export function isCrossSiteRequest(request: Request): boolean {
  const ownOrigin = new URL(request.url).origin;
  const allowed = new Set([ownOrigin]);
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      // A bad APP_URL is reported by env validation at startup.
    }
  }

  const origin = request.headers.get("origin");
  if (origin !== null && !allowed.has(origin)) return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none") return true;

  return false;
}

/**
 * Every API response depends on the request (session, rate limits), so no API
 * route may be prerendered at build time. connection() makes that explicit.
 * Outside a Next.js request (unit tests) there is nothing to wait for.
 */
async function requestTime(): Promise<void> {
  try {
    await connection();
  } catch (error) {
    unstable_rethrow(error);
  }
}

async function sessionUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export function withApi<Args extends [Request, ...unknown[]]>(
  options: ApiOptions,
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    const [request] = args;
    await requestTime();
    try {
      const unsafe = UNSAFE_METHODS.has(request.method.toUpperCase());

      if (unsafe && options.csrf !== false && isCrossSiteRequest(request)) {
        logger.warn("api.csrf_blocked", { path: new URL(request.url).pathname });
        throw new ForbiddenError("This request came from another website, so we stopped it.");
      }

      const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_JSON_BYTES;
      setBodyLimit(request, maxBodyBytes);
      const declared = Number(request.headers.get("content-length") ?? NaN);
      if (Number.isFinite(declared) && declared > maxBodyBytes) {
        throw options.tooLarge?.() ?? new PayloadTooLargeError();
      }

      const category = options.rateLimit ?? (unsafe ? "write" : "read");
      const limits = CATEGORY_LIMITS[category];
      const checks = [
        { key: `api:${category}:ip:${hashKeyPart(clientIp(request.headers))}`, limit: limits.ip },
      ];
      if (limits.user) {
        const userId = await sessionUserId();
        if (userId) checks.push({ key: `api:${category}:user:${userId}`, limit: limits.user });
      }
      try {
        await enforce(getDb(), checks);
      } catch (error) {
        // Fail open if the counter store is down, so an outage does not take
        // every route with it. Sign-in, link codes and speech have their own
        // limits that fail closed.
        if (error instanceof RateLimitError) throw error;
        logger.error("api.rate_limit_unavailable", { error });
      }

      const response = await handler(...args);
      if (!response.headers.has("cache-control")) {
        try {
          response.headers.set("Cache-Control", "no-store");
        } catch {
          // Some responses (redirects from Auth.js) have immutable headers.
        }
      }
      return response;
    } catch (error) {
      // Let Next.js handle its own control-flow errors (prerender bail-outs, redirects).
      unstable_rethrow(error);
      return errorResponse(error);
    }
  };
}
