import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEV_MOCK_SECRETS,
  EnvError,
  featureKeys,
  getEnv,
  missingFeatureKeys,
  parseEnv,
  requireFeatureKey,
  resetEnvCacheForTests,
  usedMockSecrets,
} from "@/lib/env";

const valid = {
  DATABASE_URL: "postgresql://user:pass@db.example.com/ableway?sslmode=require",
  AUTH_SECRET: "a".repeat(32),
  GEMINI_API_KEY: "gemini-key",
  STT_API_KEY: "stt-key",
  TTS_API_KEY: "tts-key",
  TELEGRAM_BOT_TOKEN: "123456789:AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQ",
  TELEGRAM_WEBHOOK_SECRET: "webhook_secret_1234",
  CRON_SECRET: "cron-secret-12345",
  APP_URL: "https://ableway.example.org/",
};

function problemsFor(source: Record<string, string | undefined>): string[] {
  try {
    parseEnv(source);
  } catch (error) {
    if (error instanceof EnvError) return error.problems;
    throw error;
  }
  return [];
}

/** Real speech settings, required in production. */
const azureSpeech = { SPEECH_PROVIDER: "azure", AZURE_SPEECH_REGION: "eastus" };

describe("speech settings", () => {
  it("default to the mock provider in development, with safe defaults", () => {
    const env = parseEnv(valid);
    expect(env.SPEECH_PROVIDER).toBe("mock");
    expect(env.SPEECH_LOW_CONFIDENCE_THRESHOLD).toBe(0.65);
    expect(env.SPEECH_RETAIN_AUDIO).toBe(false);
    expect(env.SPEECH_RETENTION_DAYS).toBe(30);
  });

  it("parse numbers and the opt-in retention flag", () => {
    const env = parseEnv({
      ...valid,
      SPEECH_LOW_CONFIDENCE_THRESHOLD: "0.8",
      SPEECH_RETAIN_AUDIO: "true",
      SPEECH_RETENTION_DAYS: "7",
    });
    expect(env.SPEECH_LOW_CONFIDENCE_THRESHOLD).toBe(0.8);
    expect(env.SPEECH_RETAIN_AUDIO).toBe(true);
    expect(env.SPEECH_RETENTION_DAYS).toBe(7);
  });

  it("reject bad values", () => {
    expect(problemsFor({ ...valid, SPEECH_PROVIDER: "google" })[0]).toMatch(/^SPEECH_PROVIDER /);
    expect(problemsFor({ ...valid, SPEECH_LOW_CONFIDENCE_THRESHOLD: "2" })[0]).toMatch(
      /^SPEECH_LOW_CONFIDENCE_THRESHOLD /,
    );
    expect(problemsFor({ ...valid, SPEECH_RETAIN_AUDIO: "yes" })[0]).toMatch(
      /^SPEECH_RETAIN_AUDIO /,
    );
  });

  it("require keys and region when the provider is azure, even in development", () => {
    expect(
      problemsFor({ ...valid, SPEECH_PROVIDER: "azure", STT_API_KEY: "", AZURE_SPEECH_REGION: "" }),
    ).toEqual([
      "STT_API_KEY is missing (needed when SPEECH_PROVIDER=azure)",
      "AZURE_SPEECH_REGION is missing (needed when SPEECH_PROVIDER=azure)",
    ]);
  });

  it("require GEMINI_API_KEY when the provider is gemini", () => {
    expect(problemsFor({ ...valid, SPEECH_PROVIDER: "gemini", GEMINI_API_KEY: "" })).toEqual([
      "GEMINI_API_KEY is missing (needed when SPEECH_PROVIDER=gemini)",
    ]);
    expect(problemsFor({ ...valid, SPEECH_PROVIDER: "gemini", NODE_ENV: "production" })).toEqual(
      [],
    );
  });

  it("refuse the mock provider in production", () => {
    expect(problemsFor({ ...valid, NODE_ENV: "production" })).toEqual([
      'SPEECH_PROVIDER must be "gemini" or "azure" in production (the mock makes no sound).',
    ]);
    expect(problemsFor({ ...valid, ...azureSpeech, NODE_ENV: "production" })).toEqual([]);
  });
});

describe("parseEnv", () => {
  it("accepts a complete, valid set", () => {
    const env = parseEnv(valid);
    expect(env.GEMINI_API_KEY).toBe("gemini-key");
    expect(env.SMS_API_KEY).toBeUndefined();
  });

  it("removes a trailing slash from APP_URL", () => {
    expect(parseEnv(valid).APP_URL).toBe("https://ableway.example.org");
  });

  it("keeps SMS_API_KEY when it is set", () => {
    expect(parseEnv({ ...valid, SMS_API_KEY: "sms" }).SMS_API_KEY).toBe("sms");
  });

  it("lists every missing variable by name (production)", () => {
    const problems = problemsFor({ NODE_ENV: "production" });
    for (const name of Object.keys(valid)) {
      expect(problems).toContain(`${name} is missing`);
    }
    expect(problems.some((p) => p.startsWith("SMS_API_KEY"))).toBe(false);
  });

  it("in development, does not require keys for features that are not built yet", () => {
    const problems = problemsFor({});
    for (const name of featureKeys) {
      expect(problems.some((p) => p.startsWith(name))).toBe(false);
    }
    expect(problems).toEqual(["DATABASE_URL is missing", "APP_URL is missing"]);
  });

  it("in development, uses mock values for empty local secrets", () => {
    const env = parseEnv({
      ...valid,
      AUTH_SECRET: "",
      TELEGRAM_WEBHOOK_SECRET: undefined,
      CRON_SECRET: " ",
    });
    expect(env.AUTH_SECRET).toBe(DEV_MOCK_SECRETS.AUTH_SECRET);
    expect(env.TELEGRAM_WEBHOOK_SECRET).toBe(DEV_MOCK_SECRETS.TELEGRAM_WEBHOOK_SECRET);
    expect(env.CRON_SECRET).toBe(DEV_MOCK_SECRETS.CRON_SECRET);
    expect(usedMockSecrets(env)).toEqual(["AUTH_SECRET", "TELEGRAM_WEBHOOK_SECRET", "CRON_SECRET"]);
  });

  it("in development, a real secret that is set is kept and still validated", () => {
    expect(parseEnv(valid).AUTH_SECRET).toBe(valid.AUTH_SECRET);
    expect(usedMockSecrets(parseEnv(valid))).toEqual([]);
    expect(problemsFor({ ...valid, AUTH_SECRET: "too-short" })).toHaveLength(1);
  });

  it("the mock values pass the same rules as real secrets", () => {
    const prod = { ...valid, ...azureSpeech, NODE_ENV: "production" };
    expect(() => parseEnv({ ...prod, ...DEV_MOCK_SECRETS })).toThrow(/development mock value/);
  });

  it("in production, refuses mock values and empty secrets", () => {
    const prod = { ...valid, ...azureSpeech, NODE_ENV: "production" };
    expect(problemsFor({ ...prod, AUTH_SECRET: DEV_MOCK_SECRETS.AUTH_SECRET })).toEqual([
      "AUTH_SECRET is a development mock value. Use a real secret.",
    ]);
    expect(problemsFor({ ...prod, CRON_SECRET: "" })).toEqual(["CRON_SECRET is missing"]);
  });

  it("in development, still checks the format of feature keys that are set", () => {
    expect(problemsFor({ ...valid, TELEGRAM_BOT_TOKEN: "not-a-token" })).toHaveLength(1);
  });

  it("missingFeatureKeys lists empty feature keys", () => {
    const env = parseEnv({ ...valid, GEMINI_API_KEY: "", TTS_API_KEY: undefined });
    expect(missingFeatureKeys(env)).toEqual(["GEMINI_API_KEY", "TTS_API_KEY"]);
    expect(missingFeatureKeys(parseEnv(valid))).toEqual([]);
  });

  it("treats empty and blank strings as missing (production)", () => {
    const prod = { ...valid, NODE_ENV: "production" };
    expect(problemsFor({ ...prod, GEMINI_API_KEY: "", STT_API_KEY: "   " })).toEqual([
      "GEMINI_API_KEY is missing",
      "STT_API_KEY is missing",
    ]);
  });

  it.each([
    ["DATABASE_URL", "mysql://x"],
    ["AUTH_SECRET", "too-short"],
    ["TELEGRAM_BOT_TOKEN", "not-a-token"],
    ["TELEGRAM_WEBHOOK_SECRET", "has spaces in it!!"],
    ["TELEGRAM_WEBHOOK_SECRET", "short"],
    ["CRON_SECRET", "short"],
    ["APP_URL", "ableway.org"],
  ])("rejects a bad %s", (name, value) => {
    const problems = problemsFor({ ...valid, [name]: value });
    expect(problems).toHaveLength(1);
    expect(problems[0]?.startsWith(`${name} `)).toBe(true);
  });

  it("gives a clear message and never prints values", () => {
    const secretValue = "super-secret-but-too-short";
    let message = "";
    try {
      parseEnv({
        ...valid,
        NODE_ENV: "production",
        AUTH_SECRET: secretValue,
        GEMINI_API_KEY: undefined,
      });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("Invalid environment variables");
    expect(message).toContain("AUTH_SECRET must be at least 32 characters");
    expect(message).toContain("GEMINI_API_KEY is missing");
    expect(message).toContain(".env.example");
    expect(message).not.toContain(secretValue);
  });
});

describe("getEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvCacheForTests();
  });

  it("reads process.env and caches the result", () => {
    for (const [key, value] of Object.entries(valid)) vi.stubEnv(key, value);
    const first = getEnv();
    vi.stubEnv("GEMINI_API_KEY", "changed");
    expect(getEnv()).toBe(first);
  });

  it("warns once in development about missing feature keys", () => {
    for (const [key, value] of Object.entries(valid)) vi.stubEnv(key, value);
    vi.stubEnv("GEMINI_API_KEY", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getEnv();
    getEnv();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("GEMINI_API_KEY");
  });

  it("requireFeatureKey returns a set key and explains a missing one", () => {
    for (const [key, value] of Object.entries(valid)) vi.stubEnv(key, value);
    vi.stubEnv("TTS_API_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(requireFeatureKey("GEMINI_API_KEY")).toBe("gemini-key");
    expect(() => requireFeatureKey("TTS_API_KEY")).toThrow(/TTS_API_KEY is missing/);
  });

  it("throws EnvError when process.env is invalid", () => {
    for (const key of Object.keys(valid)) vi.stubEnv(key, "");
    expect(() => getEnv()).toThrow(EnvError);
  });
});
