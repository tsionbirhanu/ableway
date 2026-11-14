import { createHash } from "node:crypto";

/**
 * Structured server logging without personal data.
 *
 * Every log line is one JSON object: { level, event, time, ...fields }.
 * `event` is a fixed dotted name such as "cron.retention.done", never free text.
 *
 * Personal data is removed before anything is written:
 * - Fields whose name suggests personal content (email, phone, name, text,
 *   message, transcript, reason, summary, notes, address, ip, ...) are replaced
 *   with "[redacted]".
 * - Fields that identify a person (profileId, actorId, userId, telegramId, ...)
 *   are replaced with a short one-way hash, so lines about the same person can
 *   still be grouped without revealing who it is.
 * - Every remaining string, including error messages, is scrubbed of email
 *   addresses, phone numbers, long digit runs (card or account numbers),
 *   bearer tokens, Telegram bot tokens, API keys and database URLs.
 *
 * ESLint bans console.* in app/ and lib/ (except this file), so all server
 * logging goes through here.
 */

export type LogLevel = "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;
type Sink = (level: LogLevel, line: string) => void;

const REDACT_KEYS =
  /^(e-?mail|phone|name|full_?name|first_?name|last_?name|text|content|message|body|transcript|reason|summary|notes?|address|ip|password|pass|secret|token|code|authorization|cookie|query|answer|prompt|caption|username|location)$/i;
const PSEUDONYM_KEYS = /^(profile|actor|user|learner|helper|telegram|chat|target_?profile)_?id$/i;

const SCRUBBERS: [RegExp, string][] = [
  [/postgres(?:ql)?:\/\/[^\s"']+/gi, "[db-url]"],
  [/\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/g, "[telegram-token]"],
  [/\bAIza[0-9A-Za-z_-]{30,}\b/g, "[api-key]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [token]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
  // International phone numbers: +251 911 234 567, +1-555-555-0100
  [/\+\d[\d\s-]{6,}\d/g, "[phone]"],
  // Card and account numbers: 13-19 digits, with or without spaces or dashes
  [/\b(?:\d[ -]?){12,18}\d\b/g, "[number]"],
  // Local phone numbers such as 0911 234 567 or 0911-234-567
  [/\b0\d{2,3}[\s-]?\d{3}[\s-]?\d{3,4}\b/g, "[phone]"],
  // Any other long digit run (ids, account numbers). Dates and times are kept.
  [/\b\d{9,}\b/g, "[number]"],
];

/** Remove contact details, long numbers and credentials from free text. */
export function scrub(text: string): string {
  return SCRUBBERS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

/** Short, stable, one-way id for grouping log lines about the same person. */
export function pseudonym(value: string | number): string {
  return `p_${createHash("sha256").update(String(value)).digest("base64url").slice(0, 12)}`;
}

function sanitizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const out: Record<string, unknown> = { type: error.name, message: scrub(error.message) };
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") out.code = code;
    if (error.stack) {
      // Keep only the "at ..." frames: file paths and function names, no message text.
      out.stack = error.stack
        .split("\n")
        .filter((line) => line.trim().startsWith("at "))
        .slice(0, 8)
        .map((line) => scrub(line.trim()));
    }
    return out;
  }
  return { type: typeof error, message: scrub(String(error)) };
}

export function sanitize(value: unknown, key = "", depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (key && REDACT_KEYS.test(key)) return "[redacted]";
  if (key && PSEUDONYM_KEYS.test(key) && (typeof value === "string" || typeof value === "number")) {
    return pseudonym(value);
  }
  if (key === "error" || value instanceof Error) return sanitizeError(value);
  if (typeof value === "string") return scrub(value).slice(0, 500);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= 3) return "[nested]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, "", depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        sanitize(v, k, depth + 1),
      ]),
    );
  }
  return `[${typeof value}]`;
}

const consoleSink: Sink = (level, line) => {
  // The one place console is allowed (see eslint.config.mjs).
  (level === "error" ? console.error : level === "warn" ? console.warn : console.info)(line);
};

let sink: Sink = consoleSink;

function write(level: LogLevel, event: string, fields: LogFields = {}): void {
  const safe = sanitize(fields) as Record<string, unknown>;
  sink(level, JSON.stringify({ level, event, time: new Date().toISOString(), ...safe }));
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};

/** Test helper: capture log lines instead of printing them. Pass nothing to restore. */
export function setLogSinkForTests(next?: Sink): void {
  sink = next ?? consoleSink;
}
