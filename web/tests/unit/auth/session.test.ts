import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { createTestDb, type TestDb } from "../db/test-db";
import { createAuthFixtures, type AuthFixtures } from "../helpers/auth-fixtures";

const state = vi.hoisted(() => ({ userId: null as string | null, db: null as unknown }));

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(async () => (state.userId ? { user: { id: state.userId, role: "admin" } } : null)),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => state.db }));

const { authorize, getActor, requireActor, requireRole } = await import("@/lib/auth/session");

let t: TestDb;
let f: AuthFixtures;

beforeAll(async () => {
  t = await createTestDb();
  state.db = t.db;
  f = await createAuthFixtures(t.db);
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

beforeEach(() => {
  state.userId = null;
});

describe("getActor", () => {
  it("is null when nobody is signed in", async () => {
    expect(await getActor()).toBeNull();
  });

  it("reads the role from the database, ignoring the role in the session", async () => {
    // The mocked session claims "admin"; the database says learner.
    state.userId = f.learnerA.id;
    expect(await getActor()).toEqual({ id: f.learnerA.id, role: "learner" });
  });
});

describe("requireActor", () => {
  it("throws 401 when nobody is signed in", async () => {
    await expect(requireActor()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("requireRole", () => {
  it("throws 401 when nobody is signed in", async () => {
    await expect(requireRole(["helper", "admin"])).rejects.toMatchObject({ status: 401 });
  });

  it("throws 403 for a role not in the list", async () => {
    state.userId = f.learnerA.id;
    await expect(requireRole(["helper", "admin"])).rejects.toBeInstanceOf(ForbiddenError);
    state.userId = f.contentManager.id;
    await expect(requireRole(["helper", "admin"])).rejects.toMatchObject({ status: 403 });
  });

  it("returns the actor for an allowed role", async () => {
    state.userId = f.helper.id;
    await expect(requireRole(["helper", "admin"])).resolves.toEqual({
      id: f.helper.id,
      role: "helper",
    });
    state.userId = f.admin.id;
    await expect(requireRole(["helper", "admin"])).resolves.toMatchObject({ role: "admin" });
  });
});

describe("authorize", () => {
  it("throws 403 when the policy says no", () => {
    expect(() => authorize(false)).toThrow(ForbiddenError);
    expect(() => authorize(true)).not.toThrow();
  });
});
