import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvError, getEnv, parseEnv, resetEnvCacheForTests } from "@/lib/env";

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

  it("lists every missing variable by name", () => {
    const problems = problemsFor({});
    for (const name of Object.keys(valid)) {
      expect(problems).toContain(`${name} is missing`);
    }
    expect(problems.some((p) => p.startsWith("SMS_API_KEY"))).toBe(false);
  });

  it("treats empty and blank strings as missing", () => {
    expect(problemsFor({ ...valid, GEMINI_API_KEY: "", STT_API_KEY: "   " })).toEqual([
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
      parseEnv({ ...valid, AUTH_SECRET: secretValue, GEMINI_API_KEY: undefined });
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

  it("throws EnvError when process.env is invalid", () => {
    for (const key of Object.keys(valid)) vi.stubEnv(key, "");
    expect(() => getEnv()).toThrow(EnvError);
  });
});
