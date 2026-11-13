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
/** Empty means "not set", and not set is allowed. A value that is set must still be valid. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

const secretString = (minLength: number) =>
  z
    .string({ error: "is missing" })
    .min(minLength, { error: `must be at least ${minLength} characters` });

const secret = (minLength: number) => required(secretString(minLength));

const telegramBotToken = z.string({ error: "is missing" }).regex(/^\d+:[A-Za-z0-9_-]{30,}$/, {
  error: "must look like a Telegram bot token (123456:ABC...)",
});

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
  TELEGRAM_BOT_TOKEN: required(telegramBotToken),
  // Telegram allows 1-256 characters of A-Z, a-z, 0-9, _ and -.
  TELEGRAM_WEBHOOK_SECRET: required(
    z.string({ error: "is missing" }).regex(/^[A-Za-z0-9_-]{16,256}$/, {
      error: "must be 16-256 characters using only letters, numbers, _ and -",
    }),
  ),
  SMS_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SMS_ENABLED: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false").transform((v) => v === "true")),
  CRON_SECRET: secret(16),
  APP_URL: required(
    z
      .string({ error: "is missing" })
      .regex(/^https?:\/\/[^\s/]+/, { error: "must be a full URL such as https://example.org" })
      .transform((url) => url.replace(/\/+$/, "")),
  ),

  // ---------- Speech (lib/speech) ----------
  /** "gemini" or "azure" for real speech, "mock" for tests and local work without a key. */
  SPEECH_PROVIDER: z.preprocess(
    emptyToUndefined,
    z
      .enum(["gemini", "azure", "mock"], { error: 'must be "gemini", "azure" or "mock"' })
      .default("mock"),
  ),
  /** Azure region of the Speech resource, for example "eastus" or "westeurope". */
  AZURE_SPEECH_REGION: optional(
    z.string().regex(/^[a-z0-9]+$/, { error: 'must be a region name like "eastus"' }),
  ),
  /** Below this confidence (0 to 1) the reply is flagged lowConfidence: ask the learner to repeat. */
  SPEECH_LOW_CONFIDENCE_THRESHOLD: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "must be a number from 0 to 1" })
      .min(0, { error: "must be a number from 0 to 1" })
      .max(1, { error: "must be a number from 0 to 1" })
      .default(0.65),
  ),
  /** Opt-in. Off by default: uploaded audio is never stored. */
  SPEECH_RETAIN_AUDIO: z.preprocess(
    emptyToUndefined,
    z
      .enum(["true", "false"], { error: 'must be "true" or "false"' })
      .default("false")
      .transform((value) => value === "true"),
  ),
  /** Where retained audio goes, if SPEECH_RETAIN_AUDIO=true. */
  SPEECH_RETENTION_DIR: z.preprocess(
    emptyToUndefined,
    z.string().default(".data/speech-retention"),
  ),
  /** Days to keep retained audio before deleting it. */
  /** Optional path to ffmpeg. Read directly by lib/speech/ffmpeg.ts (not a secret). */
  FFMPEG_PATH: optional(z.string()),
  SPEECH_RETENTION_DAYS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(365).default(30),
  ),
});

/**
 * Keys for features that are not built yet. Production requires them.
 * In development they may be empty, so you can run the app without
 * Gemini, speech, or Telegram accounts. Code that uses one must call
 * requireFeatureKey(), which explains what is missing.
 */
export const featureKeys = [
  "GEMINI_API_KEY",
  "STT_API_KEY",
  "TTS_API_KEY",
  "TELEGRAM_BOT_TOKEN",
] as const;
export type FeatureKey = (typeof featureKeys)[number];

/**
 * Mock secrets for local development only. Used when these keys are empty
 * and NODE_ENV is not "production". They are public (they are in this file),
 * so production refuses to start with them.
 */
export const DEV_MOCK_SECRETS = {
  AUTH_SECRET: "dev-mock-auth-secret-not-for-production-0000",
  TELEGRAM_WEBHOOK_SECRET: "dev_mock_webhook_secret_not_for_production",
  CRON_SECRET: "dev-mock-cron-secret-not-for-production",
} as const;
export type MockableKey = keyof typeof DEV_MOCK_SECRETS;
const mockableKeys = Object.keys(DEV_MOCK_SECRETS) as MockableKey[];

/** Empty means "use the mock value". A value that is set is validated as usual. */
const mockable = (key: MockableKey) =>
  z.preprocess((value) => emptyToUndefined(value) ?? DEV_MOCK_SECRETS[key], envSchema.shape[key]);

const devEnvSchema = envSchema.extend({
  AUTH_SECRET: mockable("AUTH_SECRET"),
  TELEGRAM_WEBHOOK_SECRET: mockable("TELEGRAM_WEBHOOK_SECRET"),
  CRON_SECRET: mockable("CRON_SECRET"),
  GEMINI_API_KEY: optional(secretString(1)),
  STT_API_KEY: optional(secretString(1)),
  TTS_API_KEY: optional(secretString(1)),
  TELEGRAM_BOT_TOKEN: optional(telegramBotToken),
});

export type Env = z.infer<typeof devEnvSchema>;

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
  const production = source.NODE_ENV === "production";
  const result = (production ? envSchema : devEnvSchema).safeParse(source);
  if (result.success) {
    const problems: string[] = [];
    if (production) {
      for (const key of usedMockSecrets(result.data)) {
        problems.push(`${key} is a development mock value. Use a real secret.`);
      }
      if (result.data.SPEECH_PROVIDER === "mock") {
        problems.push(
          'SPEECH_PROVIDER must be "gemini" or "azure" in production (the mock makes no sound).',
        );
      }
    }
    if (result.data.SPEECH_PROVIDER === "gemini" && !result.data.GEMINI_API_KEY) {
      problems.push("GEMINI_API_KEY is missing (needed when SPEECH_PROVIDER=gemini)");
    }
    if (result.data.SPEECH_PROVIDER === "azure") {
      for (const key of ["STT_API_KEY", "TTS_API_KEY", "AZURE_SPEECH_REGION"] as const) {
        if (!result.data[key])
          problems.push(`${key} is missing (needed when SPEECH_PROVIDER=azure)`);
      }
    }
    if (problems.length > 0) throw new EnvError(problems);
    return result.data;
  }

  const problems = result.error.issues.map((issue) => {
    const name = issue.path.join(".") || "(unknown)";
    return `${name} ${issue.message}`;
  });
  throw new EnvError(problems);
}

/** Feature keys that are empty. Always [] in production (they are required there). */
export function missingFeatureKeys(env: Env): FeatureKey[] {
  return featureKeys.filter((key) => !env[key]);
}

/** Secrets currently using their development mock value. */
export function usedMockSecrets(env: Env): MockableKey[] {
  return mockableKeys.filter((key) => env[key] === DEV_MOCK_SECRETS[key]);
}

let cached: Env | undefined;

/** Validated env for the running server. Parsed once, then cached. */
export function getEnv(): Env {
  if (!cached) {
    cached = parseEnv(process.env);
    const mocked = usedMockSecrets(cached);
    if (mocked.length > 0) {
      console.warn(`Development mode: using mock values for ${mocked.join(", ")}.`);
    }
    const missing = missingFeatureKeys(cached);
    if (missing.length > 0) {
      console.warn(
        `Development mode: these features are off until you set their keys: ${missing.join(", ")}.`,
      );
    }
  }
  return cached;
}

/** Get a feature key, or throw a clear error if it is not set. */
export function requireFeatureKey(key: FeatureKey): string {
  const value = getEnv()[key];
  if (!value) {
    throw new EnvError([`${key} is missing. Set it in .env to use this feature.`]);
  }
  return value;
}

/** Test helper: forget the cached env. */
export function resetEnvCacheForTests(): void {
  cached = undefined;
}
