/**
 * Best-effort client IP for rate limiting.
 *
 * Trust: on Vercel (and most managed hosts) the platform sets x-real-ip and
 * the first x-forwarded-for entry. If you self-host, make sure your proxy
 * overwrites these headers, or clients can spoof them to dodge per-IP limits.
 * Per-email limits still apply either way.
 */
export function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return "unknown";
}
