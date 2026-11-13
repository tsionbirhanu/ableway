import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the rule "secrets stay on the server".
 * The build already fails if a client component imports lib/env.ts
 * (it imports "server-only"). These checks catch mistakes earlier.
 */
const root = join(__dirname, "..", "..");
const sourceDirs = ["app", "components", "lib"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const read = (file: string) => readFileSync(file, "utf8");
const files = sourceDirs.flatMap((dir) => sourceFiles(join(root, dir)));

// Variable names from .env.example, so a new variable is covered automatically.
const envNames = read(join(root, ".env.example"))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
  .map((line) => line.split("=")[0] ?? "");

const isClientModule = (source: string) => /^\s*["']use client["']/m.test(source);
const importsEnv = (source: string) => /from\s+["'][^"']*lib\/env["']/.test(source);

describe("secrets boundary", () => {
  it("lib/env.ts imports server-only", () => {
    expect(read(join(root, "lib", "env.ts"))).toMatch(/^import "server-only";/m);
  });

  it("no client component imports lib/env or reads process.env", () => {
    const offenders = files
      .filter((file) => isClientModule(read(file)))
      .filter((file) => importsEnv(read(file)) || read(file).includes("process.env"))
      .map((file) => relative(root, file));
    expect(offenders).toEqual([]);
  });

  it("no secret is given a NEXT_PUBLIC_ prefix", () => {
    const offenders = files.filter((file) =>
      envNames.some((name) => read(file).includes(`NEXT_PUBLIC_${name}`)),
    );
    expect(offenders).toEqual([]);
  });

  it(".env.example lists every variable, with no real secret values", () => {
    expect([...envNames].sort()).toEqual([
      "APP_URL",
      "AUTH_SECRET",
      "CRON_SECRET",
      "DATABASE_URL",
      "GEMINI_API_KEY",
      "SMS_API_KEY",
      "STT_API_KEY",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_WEBHOOK_SECRET",
      "TTS_API_KEY",
    ]);
    const example = read(join(root, ".env.example"));
    for (const name of [
      "AUTH_SECRET",
      "GEMINI_API_KEY",
      "STT_API_KEY",
      "TTS_API_KEY",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_WEBHOOK_SECRET",
      "SMS_API_KEY",
      "CRON_SECRET",
    ]) {
      expect(example).toMatch(new RegExp(`^${name}=\\r?$`, "m"));
    }
  });
});
