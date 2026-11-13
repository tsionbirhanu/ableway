import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RateLimitError } from "@/lib/auth/errors";
import { enforce, hashKeyPart, hit, pruneRateLimits } from "@/lib/auth/rate-limit";
import { rateLimits } from "@/lib/db/schema";
import { createTestDb, type TestDb } from "../db/test-db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

const limit = { max: 3, windowSeconds: 60 };
const at = (iso: string) => new Date(iso);

describe("hit", () => {
  it("allows up to max hits per window, then blocks", async () => {
    const now = at("2026-03-01T10:00:10Z");
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await hit(t.db, "k1", limit, now));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3]?.count).toBe(4);
    expect(results[3]?.retryAfterSeconds).toBe(50);
  });

  it("starts a fresh count in the next window", async () => {
    expect((await hit(t.db, "k1", limit, at("2026-03-01T10:01:00Z"))).allowed).toBe(true);
  });

  it("keeps keys separate", async () => {
    expect((await hit(t.db, "k2", limit, at("2026-03-01T10:00:10Z"))).count).toBe(1);
  });

  it("counts parallel hits exactly (atomic upsert)", async () => {
    const now = at("2026-03-01T11:00:00Z");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => hit(t.db, "parallel", { max: 5, windowSeconds: 60 }, now)),
    );
    expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });
});

describe("enforce", () => {
  it("throws RateLimitError when any key is over its limit", async () => {
    const now = at("2026-03-02T10:00:00Z");
    const checks = [
      { key: "email:x", limit: { max: 1, windowSeconds: 60 } },
      { key: "ip:y", limit: { max: 10, windowSeconds: 60 } },
    ];
    await enforce(t.db, checks, now);
    await expect(enforce(t.db, checks, now)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("still counts every key when one is blocked", async () => {
    const now = at("2026-03-03T10:00:00Z");
    const checks = [
      { key: "blocked", limit: { max: 0, windowSeconds: 60 } },
      { key: "counted", limit: { max: 10, windowSeconds: 60 } },
    ];
    await expect(enforce(t.db, checks, now)).rejects.toBeInstanceOf(RateLimitError);
    expect((await hit(t.db, "counted", { max: 10, windowSeconds: 60 }, now)).count).toBe(2);
  });
});

describe("hashKeyPart", () => {
  it("never stores the email itself, and ignores case and spaces", () => {
    const key = hashKeyPart(" Someone@Example.org ");
    expect(key).not.toContain("someone");
    expect(key).toBe(hashKeyPart("someone@example.org"));
  });
});

describe("pruneRateLimits", () => {
  it("deletes only windows older than the cutoff", async () => {
    const before = (await t.db.select().from(rateLimits)).length;
    await hit(t.db, "fresh", limit, at("2030-01-01T00:00:00Z"));
    const deleted = await pruneRateLimits(t.db, at("2029-01-01T00:00:00Z"));
    expect(deleted).toBe(before);
    expect(await t.db.select().from(rateLimits)).toHaveLength(1);
  });
});
