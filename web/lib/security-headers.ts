/**
 * Security headers and Content Security Policy, applied by next.config.ts
 * to every response.
 *
 * Why no nonces: this app uses cacheComponents and partial prefetching, so
 * many pages are prerendered. A nonce-based CSP needs every page rendered per
 * request (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * We use the "without nonces" policy instead: scripts only from our own
 * origin plus the inline bootstrap scripts Next.js writes ('unsafe-inline').
 * Everything else is locked to 'self': no third-party scripts, no plugins,
 * no framing by other sites, forms post only to us, and the browser may only
 * connect back to this origin (all Gemini, speech and Telegram calls are
 * made by the server).
 *
 * The static Savanna pages under /pages/* are old HTML with inline scripts
 * and Typekit fonts, so they get a separate, still restrictive policy.
 */

export type HeaderRule = { source: string; headers: { key: string; value: string }[] };

const join = (directives: string[]) => directives.join("; ");

export function appCsp(dev: boolean): string {
  return join([
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Speech playback uses blob: URLs for audio returned by /api/speech/synthesize.
    "media-src 'self' data: blob:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    // The Savanna viewer frames our own /pages/*.
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ]);
}

export function savannaPagesCsp(dev: boolean): string {
  return join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
    "img-src 'self' data: blob:",
    "font-src 'self' data: https://use.typekit.net",
    "media-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ]);
}

/** Headers for every response, whatever its CSP. */
export const baseHeaders: { key: string; value: string }[] = [
  // HTTPS only for two years, including subdomains. Browsers ignore this on http://localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Older browsers that ignore frame-ancestors.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone is needed for voice input on our own pages; everything else is off.
  {
    key: "Permissions-Policy",
    value:
      "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

export function securityHeaders(dev: boolean): HeaderRule[] {
  return [
    {
      // Everything except the static Savanna pages.
      source: "/((?!pages/).*)",
      headers: [...baseHeaders, { key: "Content-Security-Policy", value: appCsp(dev) }],
    },
    {
      source: "/pages/:path*",
      headers: [...baseHeaders, { key: "Content-Security-Policy", value: savannaPagesCsp(dev) }],
    },
  ];
}
