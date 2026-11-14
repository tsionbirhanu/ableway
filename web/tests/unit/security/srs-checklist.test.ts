import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { envSchema } from "@/lib/env";

/**
 * Keeps docs/SRS-6.4-CHECKLIST.md honest: every requirement is checked off,
 * and every file it cites as code or proof exists. Also checks that the
 * deployment guide covers cron setup and every environment variable.
 */
const web = join(__dirname, "..", "..", "..");
const checklist = readFileSync(join(web, "docs", "SRS-6.4-CHECKLIST.md"), "utf8");
const rows = checklist.split("\n").filter((line) => /^\|\s*6\.4\.\d+\s*\|/.test(line));

describe("SRS 6.4 checklist", () => {
  it("lists all 22 requirements, in order", () => {
    expect(rows.map((r) => r.split("|")[1]?.trim())).toEqual(
      Array.from({ length: 22 }, (_, i) => `6.4.${i + 1}`),
    );
  });

  it.each(rows.map((row) => [row.split("|")[1]?.trim(), row]))("%s is done", (_id, row) => {
    expect(row.split("|")[2]?.trim()).toBe("[x]");
  });

  it.each(rows.map((row) => [row.split("|")[1]?.trim(), row]))(
    "%s cites code and proof that exist",
    (_id, row) => {
      const cells = row.split("|").map((c) => c.trim());
      const [code = "", proof = ""] = [cells[4], cells[5]];
      const paths = [...`${code} ${proof}`.matchAll(/`([^`]+)`/g)]
        .map((m) => m[1]!.split(" ")[0]!)
        .filter((p) => p.includes("/") || /\.(ts|md|json|yml)$/.test(p))
        // Globs such as app/api/**/route.ts describe many files; the route test covers them.
        .filter((p) => !p.includes("*"));
      expect(paths.length, "cites at least one file").toBeGreaterThan(0);
      for (const path of paths) {
        // Paths are relative to web/, except repository files such as .github/.
        const found = existsSync(join(web, path)) || existsSync(join(web, "..", path));
        expect(found, path).toBe(true);
      }
      // Every requirement is backed by an automated check (a test file or a CI job).
      expect(proof).toMatch(/tests\/unit\/|CI job/);
    },
  );
});

describe("deployment guide", () => {
  const guide = readFileSync(join(web, "docs", "DEPLOYMENT.md"), "utf8");
  const vercel = JSON.parse(readFileSync(join(web, "vercel.json"), "utf8")) as {
    crons: { path: string; schedule: string }[];
  };

  it("documents every environment variable the server reads", () => {
    for (const name of Object.keys(envSchema.shape)) {
      expect(guide, name).toContain(`\`${name}\``);
    }
  });

  it("documents every cron job with its schedule and the CRON_SECRET bearer header", () => {
    expect(vercel.crons.length).toBeGreaterThanOrEqual(2);
    for (const cron of vercel.crons) {
      expect(guide).toContain(cron.path);
      expect(guide).toContain(cron.schedule);
    }
    expect(guide).toContain("Authorization: Bearer");
  });

  it("schedules the retention job", () => {
    expect(vercel.crons.some((c) => c.path === "/api/cron/retention")).toBe(true);
  });
});

describe("SECURITY.md", () => {
  const security = readFileSync(join(web, "..", "SECURITY.md"), "utf8");
  it.each([
    "Threat: prompt injection",
    "Threat: Telegram webhook spoofing",
    "Threat: helper account misuse",
    "Dependency audit",
  ])("has a section: %s", (heading) => {
    expect(security).toContain(`## ${heading}`);
  });
});
