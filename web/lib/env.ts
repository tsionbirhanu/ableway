import "server-only";
import { z } from "zod";

/**
 * Server environment variables.
 *
 * This module imports "server-only", so the build fails if any client
 * component imports it. Secrets never reach the browser bundle.
 *
 * Only expose a value to the browser with a NEXT_PUBLIC_ prefix, and never
 * do that for anything in this schema.
 */

/** Treat empty strings as "not set", so `FOO=` in a .env file counts as missing. */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const required = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema);

const secret = (minLength: number) =>
  required(
    z
      .string({ error: "is missing" })
      .min(minLength, { error: `must be at least ${minLength} characters` }),
  );

export const envSchema = z.object({
  DATABASE_URL: required(
    z.string({ error: "is missing" }).regex(/^postgres(ql)?:\/\/.+/, {
      error: "must be a Postgres URL that starts with postgres:// or postgresql://",
    }),
  ),
  AUTH_SECRET: secret(32),
  GEMINI_API_KEY: secret(1),
  STT_API_KEY: secret(1),
  TTS_API_KEY: secret(1),
  TELEGRAM_BOT_TOKEN: required(
    z.string({ error: "is missing" }).regex(/^\d+:[A-Za-z0-9_-]{30,}$/, {
      error: "must look like a Telegram bot token (123456:ABC...)",
    }),
  ),
  // Telegram allows 1-256 characters of A-Z, a-z, 0-9, _ and -.
  TELEGRAM_WEBHOOK_SECRET: required(
    z.string({ error: "is missing" }).regex(/^[A-Za-z0-9_-]{16,256}$/, {
      error: "must be 16-256 characters using only letters, numbers, _ and -",
    }),
  ),
  SMS_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  CRON_SECRET: secret(16),
  APP_URL: required(
    z
      .string({ error: "is missing" })
      .regex(/^https?:\/\/[^\s/]+/, { error: "must be a full URL such as https://example.org" })
      .transform((url) => url.replace(/\/+$/, "")),
  ),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(public readonly problems: string[]) {
    super(
      [
        "Invalid environment variables. Fix these and restart the server:",
        ...problems.map((problem) => `  - ${problem}`),
        "See .env.example for the full list.",
      ].join("\n"),
    );
    this.name = "EnvError";
  }
}

/**
 * Validate a set of variables. Error messages name the variable and the
 * problem but never include the value, so secrets are not written to logs.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const name = issue.path.join(".") || "(unknown)";
    return `${name} ${issue.message}`;
  });
  throw new EnvError(problems);
}

let cached: Env | undefined;

/** Validated env for the running server. Parsed once, then cached. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Test helper: forget the cached env. */
export function resetEnvCacheForTests(): void {
  cached = undefined;
}
