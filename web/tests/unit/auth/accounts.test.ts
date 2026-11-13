import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { registerLearner, verifyPasswordLogin } from "@/lib/auth/accounts";
import { ConflictError, RateLimitError } from "@/lib/auth/errors";
import { verifyPassword } from "@/lib/auth/password";

// Wrap verifyPassword so we can count calls, keeping the real behaviour.
vi.mock("@/lib/auth/password", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth/password")>();
  return { ...real, verifyPassword: vi.fn(real.verifyPassword) };
});
import { auditLog, passwordCredentials, profiles } from "@/lib/db/schema";
import { createTestDb, type TestDb } from "../db/test-db";

// Weak settings so tests run fast. Production uses DEFAULT_SCRYPT.
const scrypt = { N: 2 ** 10, r: 8, p: 1 };
let t: TestDb;
let ipCounter = 0;
const freshIp = () => `192.0.2.${++ipCounter}`;

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

const good = { name: "Meron", email: "Meron@Example.org ", password: "my cat likes tea" };

describe("registerLearner", () => {
  it("creates a learner with a hashed password and an audit entry", async () => {
    const actor = await registerLearner(t.db, good, { ip: freshIp(), scrypt });
    expect(actor.role).toBe("learner");

    const [profile] = await t.db.select().from(profiles).where(eq(profiles.id, actor.id));
    expect(profile?.email).toBe("meron@example.org");

    const [cred] = await t.db
      .select()
      .from(passwordCredentials)
      .where(eq(passwordCredentials.profileId, actor.id));
    expect(cred?.passwordHash.startsWith("scrypt$")).toBe(true);
    expect(cred?.passwordHash).not.toContain(good.password);

    const audit = await t.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.target, `profiles:${actor.id}`));
    expect(audit[0]?.action).toBe("account.created");
  });

  it("always creates a learner, whatever role is sent", async () => {
    const actor = await registerLearner(
      t.db,
      { ...good, email: "sneaky@example.org", role: "admin" },
      { ip: freshIp(), scrypt },
    );
    expect(actor.role).toBe("learner");
  });

  it("refuses a second account with the same email (any case)", async () => {
    await expect(
      registerLearner(t.db, { ...good, email: "MERON@example.org" }, { ip: freshIp(), scrypt }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects weak passwords and bad emails with plain-language messages", async () => {
    const attempt = (input: object) =>
      registerLearner(t.db, { ...good, ...input }, { ip: freshIp(), scrypt });
    await expect(attempt({ password: "short" })).rejects.toBeInstanceOf(ZodError);
    await expect(attempt({ password: "password123" })).rejects.toThrow(/too easy to guess/);
    await expect(attempt({ email: "not-an-email" })).rejects.toThrow(/full email address/);
    await expect(attempt({ name: "   " })).rejects.toThrow(/your name/);
  });

  it("rate limits sign-ups per IP", async () => {
    const ip = freshIp();
    for (let i = 0; i < 10; i++) {
      await registerLearner(t.db, { ...good, email: `bulk${i}@example.org` }, { ip, scrypt });
    }
    await expect(
      registerLearner(t.db, { ...good, email: "bulk-extra@example.org" }, { ip, scrypt }),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe("verifyPasswordLogin", () => {
  beforeAll(async () => {
    await registerLearner(t.db, { ...good, email: "login@example.org" }, { ip: freshIp(), scrypt });
  });

  const login = (email: string, pw: string, ip = freshIp()) =>
    verifyPasswordLogin(t.db, { email, password: pw }, { ip, scrypt });

  it("signs in with the right password, ignoring email case and spaces", async () => {
    const actor = await login(" LOGIN@example.org", good.password);
    expect(actor?.role).toBe("learner");
  });

  it("returns null for a wrong password", async () => {
    expect(await login("login@example.org", "wrong password")).toBeNull();
  });

  it("returns null for an unknown email, and still does the hashing work", async () => {
    const calls = vi.mocked(verifyPassword).mock.calls.length;
    expect(await login("nobody@example.org", good.password)).toBeNull();
    expect(vi.mocked(verifyPassword).mock.calls.length).toBe(calls + 1);
  });

  it("returns null for malformed input instead of throwing", async () => {
    expect(await verifyPasswordLogin(t.db, { email: 5 }, { ip: freshIp(), scrypt })).toBeNull();
    expect(await verifyPasswordLogin(t.db, null, { ip: freshIp(), scrypt })).toBeNull();
  });

  it("rate limits per email, even from different IPs", async () => {
    await registerLearner(
      t.db,
      { ...good, email: "target@example.org" },
      { ip: freshIp(), scrypt },
    );
    for (let i = 0; i < 5; i++) await login("target@example.org", "guess " + i);
    await expect(login("target@example.org", good.password)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("rate limits per IP, across different emails", async () => {
    const ip = freshIp();
    for (let i = 0; i < 30; i++) await login(`spray${i}@example.org`, "guess", ip);
    await expect(login("login@example.org", good.password, ip)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("upgrades an old, weaker hash after a successful sign-in", async () => {
    const weaker = { N: 2 ** 8, r: 8, p: 1 };
    const actor = await registerLearner(
      t.db,
      { ...good, email: "upgrade@example.org" },
      { ip: freshIp(), scrypt: weaker },
    );
    await login("upgrade@example.org", good.password);
    const [cred] = await t.db
      .select()
      .from(passwordCredentials)
      .where(eq(passwordCredentials.profileId, actor.id));
    expect(cred?.passwordHash.startsWith(`scrypt$${scrypt.N}$`)).toBe(true);
  });
});
