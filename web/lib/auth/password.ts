import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export type ScryptParams = { N: number; r: number; p: number };

/** OWASP Password Storage Cheat Sheet minimum for scrypt. Uses about 128 MB per hash. */
export const DEFAULT_SCRYPT: ScryptParams = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

const maxmem = ({ N, r }: ScryptParams) => 128 * N * r * 2;

/**
 * Hash a password. The result records its own parameters, so we can raise
 * them later and still check old hashes: scrypt$N$r$p$salt$hash
 */
export async function hashPassword(
  password: string,
  params: ScryptParams = DEFAULT_SCRYPT,
): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...params,
    maxmem: maxmem(params),
  });
  return [
    "scrypt",
    params.N,
    params.r,
    params.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

/** Constant-time check. Returns false (never throws) for a malformed hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (!N || !r || !p || N > 2 ** 20 || r > 32 || p > 16) return false;
  const salt = Buffer.from(parts[4] ?? "", "base64url");
  const expected = Buffer.from(parts[5] ?? "", "base64url");
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;
  const actual = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r,
    p,
    maxmem: maxmem({ N, r, p }),
  });
  return timingSafeEqual(actual, expected);
}

/** True when a hash uses weaker settings than today's default, so we should re-hash after sign-in. */
export function needsRehash(stored: string, params: ScryptParams = DEFAULT_SCRYPT): boolean {
  const [, N, r, p] = stored.split("$").map(Number);
  return N !== params.N || r !== params.r || p !== params.p;
}

/**
 * A precomputed hash of a random password. We check unknown emails against
 * it, so a wrong email takes as long as a wrong password and does not reveal
 * which emails have accounts.
 */
const dummyHashes = new Map<string, Promise<string>>();
export function getDummyHash(params: ScryptParams = DEFAULT_SCRYPT): Promise<string> {
  const key = `${params.N}:${params.r}:${params.p}`;
  let hash = dummyHashes.get(key);
  if (!hash) {
    hash = hashPassword(randomBytes(16).toString("hex"), params);
    dummyHashes.set(key, hash);
  }
  return hash;
}

// ---------- Password rules (NIST SP 800-63B) ----------

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/**
 * Very common passwords, checked case-insensitively.
 * TODO: replace with a larger breached-password list (for example a k-anonymity check).
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "11111111",
  "00000000",
  "87654321",
  "qwertyuiop",
  "qwerty123",
  "iloveyou",
  "abc12345",
  "abcd1234",
  "letmein1",
  "welcome1",
  "welcome123",
  "admin123",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "superman",
  "ableway1",
  "ableway123",
]);

/**
 * No "must include a symbol" rules: they are hard to use with a screen
 * reader and do not make passwords stronger. Spaces are allowed, so a
 * short sentence works well as a password.
 */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, {
    error: `Use at least ${PASSWORD_MIN} characters. A short sentence works well.`,
  })
  .max(PASSWORD_MAX, { error: `Use ${PASSWORD_MAX} characters or fewer.` })
  .refine((value) => value.trim().length >= PASSWORD_MIN, {
    error: `Use at least ${PASSWORD_MIN} characters, not counting spaces at the start or end.`,
  })
  .refine((value) => !COMMON_PASSWORDS.has(value.trim().toLowerCase()), {
    error: "This password is too easy to guess. Please choose another one.",
  })
  .refine((value) => new Set(value).size > 2, {
    error: "This password is too easy to guess. Please choose another one.",
  });
