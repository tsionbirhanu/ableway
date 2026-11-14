/**
 * CI check: no secret reaches the browser.
 *
 * Run after `next build`:  pnpm check:bundle
 *
 * Scans everything a browser can download from the build:
 * - .next/static/**          (JavaScript chunks, CSS, build manifests)
 * - .next/server/app/**      prerendered .html, .rsc, .body and .meta files
 *                            (sent to the browser as page HTML / RSC payloads)
 *
 * It fails if it finds:
 * 1. The value of any server secret that was set when the build ran.
 *    CI builds with unique fake values ("canaries") for every secret, so a
 *    leak of any of them is caught even though no real secret is present.
 * 2. Anything that looks like a credential: Telegram bot tokens, Google API
 *    keys, Postgres URLs with a password, private keys, Bearer tokens.
 * 3. A server-only variable name with a NEXT_PUBLIC_ prefix, or a read of a
 *    server secret through process.env in client code.
 *
 * Findings name the file and the kind of secret, never the value.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const SECRET_ENV_NAMES = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "GEMINI_API_KEY",
  "STT_API_KEY",
  "TTS_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "SMS_API_KEY",
  "CRON_SECRET",
] as const;

const PATTERNS: { kind: string; pattern: RegExp }[] = [
  { kind: "Telegram bot token", pattern: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/ },
  { kind: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  {
    kind: "Postgres URL with password",
    pattern: /postgres(?:ql)?:\/\/[^\s"'`:/@]+:[^\s"'`@]{6,}@[^\s"'`]+/,
  },
  { kind: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { kind: "Bearer token", pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{30,}={0,2}/ },
];

const CLIENT_EXTENSIONS = /\.(js|mjs|css|map|json|txt|html|rsc|body|meta)$/;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export type Finding = { file: string; kind: string };

export function clientFiles(buildDir: string): string[] {
  const staticFiles = walk(join(buildDir, "static"));
  const prerendered = walk(join(buildDir, "server", "app")).filter((f) =>
    /\.(html|rsc|body|meta)$/.test(f),
  );
  return [...staticFiles, ...prerendered].filter((f) => CLIENT_EXTENSIONS.test(f));
}

export function scanText(text: string, secretValues: { name: string; value: string }[]): string[] {
  const kinds: string[] = [];
  for (const { name, value } of secretValues) {
    if (text.includes(value)) kinds.push(`value of ${name}`);
  }
  for (const { kind, pattern } of PATTERNS) {
    if (pattern.test(text)) kinds.push(kind);
  }
  for (const name of SECRET_ENV_NAMES) {
    if (text.includes(`NEXT_PUBLIC_${name}`)) kinds.push(`NEXT_PUBLIC_${name}`);
    if (text.includes(`process.env.${name}`)) kinds.push(`process.env.${name} read in client code`);
  }
  return kinds;
}

export function scanBuild(
  buildDir: string,
  env: Record<string, string | undefined> = process.env,
): Finding[] {
  // Short values (for example "true") would match by accident; real secrets are long.
  const secretValues = SECRET_ENV_NAMES.flatMap((name) => {
    const value = env[name]?.trim();
    return value && value.length >= 12 ? [{ name, value }] : [];
  });
  const findings: Finding[] = [];
  for (const file of clientFiles(buildDir)) {
    const text = readFileSync(file, "utf8");
    for (const kind of scanText(text, secretValues)) {
      findings.push({ file: relative(process.cwd(), file), kind });
    }
  }
  return findings;
}

function main() {
  const buildDir = process.argv[2] ?? ".next";
  const files = clientFiles(buildDir);
  if (files.length === 0) {
    console.error(`No client build output found in ${buildDir}. Run "pnpm build" first.`);
    process.exit(2);
  }
  const checked = SECRET_ENV_NAMES.filter((name) => (process.env[name]?.trim().length ?? 0) >= 12);
  const findings = scanBuild(buildDir);
  console.log(
    `Scanned ${files.length} client files for ${checked.length} secret values and ${PATTERNS.length} credential patterns.`,
  );
  if (checked.length < SECRET_ENV_NAMES.length) {
    const missing = SECRET_ENV_NAMES.filter((name) => !checked.includes(name));
    console.log(`Not set at build time (only patterns checked): ${missing.join(", ")}`);
  }
  if (findings.length > 0) {
    console.error("Secrets found in the client bundle:");
    for (const f of findings) console.error(`  - ${f.file}: ${f.kind}`);
    process.exit(1);
  }
  console.log("OK: no secrets in the client bundle.");
}

if (process.argv[1]?.endsWith("check-client-bundle.ts")) main();
