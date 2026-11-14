import { afterEach, describe, expect, it } from "vitest";
import { logger, pseudonym, sanitize, scrub, setLogSinkForTests } from "@/lib/log";
import { appCsp, savannaPagesCsp, securityHeaders } from "@/lib/security-headers";

afterEach(() => setLogSinkForTests());

describe("logging without personal data", () => {
  it("scrubs contact details, long numbers and credentials from free text", () => {
    const text = scrub(
      "abebe@example.com +251 911 234 567 card 4111111111111111 " +
        "postgresql://u:p@host/db Bearer abc.def.ghi 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ1234567890",
    );
    expect(text).not.toMatch(/abebe|911|4111|u:p@|abc\.def|ABCdef/);
    expect(scrub("call 0911 234 567 or 0911-234-567")).not.toMatch(/0911|234|567/);
  });

  it("keeps dates, times and small numbers readable", () => {
    expect(scrub("window 2026-11-14T00:45:00.000Z status 429 after 120 tries")).toBe(
      "window 2026-11-14T00:45:00.000Z status 429 after 120 tries",
    );
  });

  it("redacts personal fields and pseudonymises person ids", () => {
    const out = sanitize({
      email: "a@b.co",
      name: "Abebe",
      reason: "I cannot pay",
      transcript: "my PIN is 1234",
      profileId: "8f0c4c1e-1111-2222-3333-444455556666",
      telegramId: 123456789,
      count: 3,
    }) as Record<string, unknown>;
    expect(out).toMatchObject({
      email: "[redacted]",
      name: "[redacted]",
      reason: "[redacted]",
      transcript: "[redacted]",
      count: 3,
    });
    expect(out.profileId).toBe(pseudonym("8f0c4c1e-1111-2222-3333-444455556666"));
    expect(String(out.telegramId)).toMatch(/^p_/);
  });

  it("writes one JSON line per event with only safe fields", () => {
    const lines: string[] = [];
    setLogSinkForTests((_level, line) => lines.push(line));
    logger.error("test.event", {
      error: new Error("duplicate key: Key (email)=(abebe@example.com) already exists"),
      actorId: "x",
    });
    const entry = JSON.parse(lines[0]!);
    expect(entry.event).toBe("test.event");
    expect(entry.level).toBe("error");
    expect(JSON.stringify(entry)).not.toContain("abebe@example.com");
    expect(entry.error.type).toBe("Error");
  });
});

describe("security headers and CSP", () => {
  const rules = securityHeaders(false);
  const header = (source: string, key: string) =>
    rules.find((r) => r.source === source)?.headers.find((h) => h.key === key)?.value;

  it("sends the standard hardening headers on every route", () => {
    for (const rule of rules) {
      const keys = rule.headers.map((h) => h.key);
      for (const key of [
        "Content-Security-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Cross-Origin-Opener-Policy",
      ]) {
        expect(keys, `${rule.source} ${key}`).toContain(key);
      }
    }
    expect(header("/((?!pages/).*)", "X-Content-Type-Options")).toBe("nosniff");
    expect(header("/((?!pages/).*)", "Permissions-Policy")).toContain("microphone=(self)");
    expect(header("/((?!pages/).*)", "Permissions-Policy")).toContain("camera=()");
  });

  it("locks the app CSP down to this origin", () => {
    const csp = appCsp(false);
    for (const directive of [
      "default-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "connect-src 'self'",
      "upgrade-insecure-requests",
    ]) {
      expect(csp).toContain(directive);
    }
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/https?:\/\//);
    expect(csp).not.toContain("*");
  });

  it("allows eval and websockets only in development", () => {
    expect(appCsp(true)).toContain("'unsafe-eval'");
    expect(appCsp(true)).toContain("ws:");
  });

  it("gives the static Savanna pages only Typekit on top of self", () => {
    const csp = savannaPagesCsp(false);
    const hosts = [...csp.matchAll(/https:\/\/[^\s;]+/g)].map((m) => m[0]);
    expect(new Set(hosts)).toEqual(new Set(["https://use.typekit.net", "https://p.typekit.net"]));
    expect(csp).toContain("object-src 'none'");
  });
});

describe("prompt injection: assistant navigation stays on this site", () => {
  it("accepts app paths and refuses outside or script URLs", async () => {
    const { validateAndFilterAction } = await import("@/lib/assistant/tools");
    const ctx = { page: "/courses", allowedActions: ["go_to_page"] };
    expect(
      validateAndFilterAction("go_to_page", { page: "/payment?course=1" }, ctx),
    ).not.toBeNull();
    for (const page of [
      "https://evil.example/login",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "data:text/html,hi",
    ]) {
      expect(validateAndFilterAction("go_to_page", { page }, ctx), page).toBeNull();
    }
  });
});
