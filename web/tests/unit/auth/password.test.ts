import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCRYPT,
  getDummyHash,
  hashPassword,
  needsRehash,
  newPasswordSchema,
  verifyPassword,
} from "@/lib/auth/password";

const fast = { N: 2 ** 10, r: 8, p: 1 };

describe("hashPassword / verifyPassword", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery", fast);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });

  it("uses a new salt each time", async () => {
    expect(await hashPassword("same password", fast)).not.toBe(
      await hashPassword("same password", fast),
    );
  });

  it("records its parameters in the hash", async () => {
    const hash = await hashPassword("abc defgh", fast);
    expect(hash).toMatch(/^scrypt\$1024\$8\$1\$[\w-]+\$[\w-]+$/);
  });

  it("treats different Unicode forms of the same text as equal", async () => {
    const hash = await hashPassword("café au lait", fast);
    expect(await verifyPassword("café au lait", hash)).toBe(true);
  });

  it("returns false for malformed or hostile hashes instead of throwing", async () => {
    for (const bad of [
      "",
      "bcrypt$x",
      "scrypt$1024$8$1$salt",
      "scrypt$0$8$1$c2FsdA$aGFzaA",
      "scrypt$2097152$8$1$c2FsdA$aGFzaA",
    ]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });

  it("works at the production strength (OWASP minimum)", async () => {
    expect(DEFAULT_SCRYPT).toEqual({ N: 2 ** 17, r: 8, p: 1 });
    const hash = await hashPassword("production strength", DEFAULT_SCRYPT);
    expect(await verifyPassword("production strength", hash)).toBe(true);
  }, 20_000);
});

describe("needsRehash", () => {
  it("is true only when parameters differ from the target", async () => {
    const hash = await hashPassword("abcdefgh1", fast);
    expect(needsRehash(hash, fast)).toBe(false);
    expect(needsRehash(hash, DEFAULT_SCRYPT)).toBe(true);
  });
});

describe("getDummyHash", () => {
  it("is cached per parameter set", async () => {
    expect(await getDummyHash(fast)).toBe(await getDummyHash(fast));
    expect(await getDummyHash(fast)).not.toBe(await getDummyHash({ N: 2 ** 9, r: 8, p: 1 }));
  });
});

describe("newPasswordSchema (NIST rules, no symbol requirements)", () => {
  it.each(["my cat likes tea", "abcdefgh", "12 green bottles", "abc".repeat(42)])(
    "accepts %j",
    (value) => {
      expect(newPasswordSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each([
    ["too short", "abc"],
    ["too long", "a b".repeat(50)],
    ["only spaces padding", "   abc   "],
    ["common", "Password123"],
    ["common", "qwertyuiop"],
    ["one repeated character", "aaaaaaaaaa"],
  ])("rejects %s", (_reason, value) => {
    expect(newPasswordSchema.safeParse(value).success).toBe(false);
  });

  it("gives short, plain messages", () => {
    const result = newPasswordSchema.safeParse("abc");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Use at least 8 characters. A short sentence works well.",
      );
    }
  });
});
