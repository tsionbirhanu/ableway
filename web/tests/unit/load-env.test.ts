import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEnvFiles } from "@/scripts/load-env";

const dir = mkdtempSync(join(tmpdir(), "ableway-env-"));
const file = (name: string, body: string) => {
  const path = join(dir, name);
  writeFileSync(path, body);
  return path;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadEnvFiles", () => {
  it("reads a plain .env file", () => {
    vi.stubEnv("ABLEWAY_TEST_A", undefined);
    const env = file("a.env", "ABLEWAY_TEST_A=from-dotenv\n");
    expect(loadEnvFiles([env])).toEqual([env]);
    expect(process.env.ABLEWAY_TEST_A).toBe("from-dotenv");
  });

  it("gives the first file priority (.env.local over .env)", () => {
    vi.stubEnv("ABLEWAY_TEST_B", undefined);
    const local = file("b.local", "ABLEWAY_TEST_B=local\n");
    const base = file("b.env", "ABLEWAY_TEST_B=base\n");
    loadEnvFiles([local, base]);
    expect(process.env.ABLEWAY_TEST_B).toBe("local");
  });

  it("never overrides variables already set in the shell", () => {
    vi.stubEnv("ABLEWAY_TEST_C", "shell");
    loadEnvFiles([file("c.env", "ABLEWAY_TEST_C=file\n")]);
    expect(process.env.ABLEWAY_TEST_C).toBe("shell");
  });

  it("skips files that do not exist", () => {
    expect(loadEnvFiles([join(dir, "missing.env")])).toEqual([]);
  });
});
