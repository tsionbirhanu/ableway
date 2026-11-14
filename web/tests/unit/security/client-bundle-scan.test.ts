import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanBuild, scanText } from "@/scripts/check-client-bundle";

/** The CI bundle check must actually catch leaks, not only pass. */
describe("client bundle secret scan", () => {
  const canary = { name: "AUTH_SECRET", value: "ci-canary-auth-secret-7d1e9a4b2c6f8e0a3b5d" };

  it("finds a leaked secret value", () => {
    expect(scanText(`var a="${canary.value}"`, [canary])).toEqual(["value of AUTH_SECRET"]);
  });

  it("finds credentials by pattern even when no value is known", () => {
    expect(scanText("t='123456789:AAHf9xQ2bC3dE4fG5hI6jK7lM8nO9pQ0rSt'", [])).toContain(
      "Telegram bot token",
    );
    expect(scanText("k='AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q'", [])).toContain("Google API key");
    expect(scanText("u='postgresql://user:hunter2secret@db.example/x'", [])).toContain(
      "Postgres URL with password",
    );
    expect(scanText("process.env.CRON_SECRET", [])).toContain(
      "process.env.CRON_SECRET read in client code",
    );
    expect(scanText("NEXT_PUBLIC_GEMINI_API_KEY", [])).toContain("NEXT_PUBLIC_GEMINI_API_KEY");
  });

  it("passes clean output", () => {
    expect(scanText('console.log("hello");self.__next_f.push([1,"ok"])', [canary])).toEqual([]);
  });

  it("scans static chunks and prerendered pages in a build folder", () => {
    const dir = mkdtempSync(join(tmpdir(), "bundle-scan-"));
    mkdirSync(join(dir, "static", "chunks"), { recursive: true });
    mkdirSync(join(dir, "server", "app"), { recursive: true });
    writeFileSync(join(dir, "static", "chunks", "a.js"), "clean();");
    writeFileSync(join(dir, "server", "app", "index.html"), `<p>${canary.value}</p>`);
    // Server-only code is not sent to browsers, so it is not scanned.
    writeFileSync(join(dir, "server", "app", "page.js"), `const s="${canary.value}"`);

    const findings = scanBuild(dir, { AUTH_SECRET: canary.value });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.file).toMatch(/index\.html$/);
    expect(findings[0]?.kind).toBe("value of AUTH_SECRET");
  });
});
