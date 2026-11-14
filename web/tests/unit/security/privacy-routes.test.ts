import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as s from "@/lib/db/schema";
import { createTestDb, type TestDb } from "../db/test-db";
import { createAuthFixtures, type AuthFixtures } from "../helpers/auth-fixtures";

/** Privacy, audit and access-control routes, run for real against PGlite. */
const state = vi.hoisted(() => ({ userId: null as string | null, db: null as unknown }));
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(async () => (state.userId ? { user: { id: state.userId } } : null)),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => state.db }));

const exportRoute = await import("@/app/api/profile/export/route");
const deleteRoute = await import("@/app/api/profile/delete/route");
const consentRoute = await import("@/app/api/profile/consents/route");
const roleRoute = await import("@/app/api/admin/profiles/[id]/role/route");
const helpStatusRoute = await import("@/app/api/help/[id]/status/route");
const helpRoute = await import("@/app/api/help/route");
const enrollRoute = await import("@/app/api/enrollments/route");
const retentionCron = await import("@/app/api/cron/retention/route");
const transferRoute = await import("@/app/api/helper/requests/[id]/transfer/route");
const knowledgeRoute = await import("@/app/api/admin/knowledge/route");
const { getEnv } = await import("@/lib/env");

let t: TestDb;
let f: AuthFixtures;
let ip = 0;

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

const as = (who: { id: string } | null) => {
  state.userId = who?.id ?? null;
};
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as never;
const request = (path: string, init: RequestInit = {}) =>
  new Request(`http://test.local${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-real-ip": `10.3.${++ip % 250}.1`,
      ...init.headers,
    },
  });
const json = (path: string, method: string, body: unknown) =>
  request(path, { method, body: JSON.stringify(body) });

async function newLearner(name: string) {
  const [p] = await t.db
    .insert(s.profiles)
    .values({ name, role: "learner", phone: `+1555${6000000 + ++ip}` })
    .returning({ id: s.profiles.id, role: s.profiles.role });
  return p!;
}

describe("GET /api/profile/export", () => {
  it("needs sign-in", async () => {
    expect((await exportRoute.GET(request("/api/profile/export"))).status).toBe(401);
  });

  it("downloads the signed-in learner's own data as JSON, and is audited", async () => {
    as(f.learnerA);
    const res = await exportRoute.GET(request("/api/profile/export"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toMatch(
      /attachment; filename="ableway-my-data-/,
    );
    const data = await res.json();
    expect(data.profile.id).toBe(f.learnerA.id);
    expect(JSON.stringify(data)).not.toContain("Learner B");

    const audits = await t.db
      .select()
      .from(s.auditLog)
      .where(eq(s.auditLog.action, "data.exported"));
    expect(audits.some((a) => a.actorId === f.learnerA.id)).toBe(true);
  });
});

describe("/api/profile/consents", () => {
  it("records an opt-in and an opt-out", async () => {
    const p = await newLearner("Consent Route Learner");
    as(p);
    const before = await (await consentRoute.GET(request("/api/profile/consents"))).json();
    expect(
      before.consents.find((c: { purpose: string }) => c.purpose === "voice_retention").granted,
    ).toBe(false);
    expect(before.voiceRetention.days).toBe(getEnv().SPEECH_RETENTION_DAYS);

    const on = await consentRoute.POST(
      json("/api/profile/consents", "POST", { purpose: "voice_retention", granted: true }),
    );
    expect(on.status).toBe(200);
    const after = await on.json();
    expect(
      after.consents.find((c: { purpose: string }) => c.purpose === "voice_retention").granted,
    ).toBe(true);
  });

  it("rejects unknown purposes and extra fields", async () => {
    as(f.learnerA);
    const bad = await consentRoute.POST(
      json("/api/profile/consents", "POST", { purpose: "sell_my_data", granted: true }),
    );
    expect(bad.status).toBe(400);
    const extra = await consentRoute.POST(
      json("/api/profile/consents", "POST", {
        purpose: "job_alerts",
        granted: true,
        profileId: f.learnerB.id,
      }),
    );
    expect(extra.status).toBe(400);
  });
});

describe("DELETE /api/profile/delete", () => {
  it("requires explicit confirmation", async () => {
    const p = await newLearner("Unconfirmed Learner");
    as(p);
    const res = await deleteRoute.DELETE(json("/api/profile/delete", "DELETE", {}));
    expect(res.status).toBe(400);
    expect(await t.db.select().from(s.profiles).where(eq(s.profiles.id, p.id))).toHaveLength(1);
  });

  it("deletes the account, its conversations, Telegram link and subscriptions, and clears the session", async () => {
    const p = await newLearner("Leaving Learner");
    const [conv] = await t.db
      .insert(s.conversations)
      .values({ profileId: p.id, channel: "web" })
      .returning();
    await t.db
      .insert(s.telegramLinks)
      .values({ profileId: p.id, telegramId: 990001, consentAt: new Date() });
    await t.db.insert(s.alertSubscriptions).values({ profileId: p.id, keywords: ["x"] });
    as(p);

    const res = await deleteRoute.DELETE(json("/api/profile/delete", "DELETE", { confirm: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toMatchObject({ conversations: 1, telegramLinks: 1, subscriptions: 1 });
    expect(res.headers.get("set-cookie")).toContain("authjs.session-token=;");

    expect(await t.db.select().from(s.profiles).where(eq(s.profiles.id, p.id))).toHaveLength(0);
    expect(
      await t.db.select().from(s.conversations).where(eq(s.conversations.id, conv!.id)),
    ).toHaveLength(0);
    expect(
      await t.db.select().from(s.telegramLinks).where(eq(s.telegramLinks.profileId, p.id)),
    ).toHaveLength(0);
    expect(
      await t.db
        .select()
        .from(s.alertSubscriptions)
        .where(eq(s.alertSubscriptions.profileId, p.id)),
    ).toHaveLength(0);

    // The old session no longer works.
    expect((await exportRoute.GET(request("/api/profile/export"))).status).toBe(401);
  });

  it("refuses a cross-site request (CSRF)", async () => {
    const p = await newLearner("CSRF Learner");
    as(p);
    const res = await deleteRoute.DELETE(
      request("/api/profile/delete", {
        method: "DELETE",
        body: JSON.stringify({ confirm: true }),
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(res.status).toBe(403);
    expect(await t.db.select().from(s.profiles).where(eq(s.profiles.id, p.id))).toHaveLength(1);
  });
});

describe("PATCH /api/admin/profiles/[id]/role", () => {
  const change = (id: string, role: string) =>
    roleRoute.PATCH(json(`/api/admin/profiles/${id}/role`, "PATCH", { role }), ctx({ id }));

  it("is admin-only and never changes your own role", async () => {
    const p = await newLearner("Role Target");
    as(f.helper);
    expect((await change(p.id, "helper")).status).toBe(403);
    as(f.admin);
    expect((await change(f.admin.id, "learner")).status).toBe(403);
  });

  it("changes the role and writes an audit row with old and new role", async () => {
    const p = await newLearner("Promoted Learner");
    as(f.admin);
    const res = await change(p.id, "helper");
    expect(res.status).toBe(200);
    const [row] = await t.db.select().from(s.profiles).where(eq(s.profiles.id, p.id));
    expect(row?.role).toBe("helper");
    const [audit] = await t.db
      .select()
      .from(s.auditLog)
      .where(eq(s.auditLog.target, `profiles:${p.id}`));
    expect(audit).toMatchObject({ action: "role.changed", actorId: f.admin.id });
    expect(audit?.metadata).toEqual({ from: "learner", to: "helper" });
  });
});

describe("knowledge edits are audited", () => {
  it("records knowledge.created", async () => {
    as(f.contentManager);
    const res = await knowledgeRoute.POST(
      json("/api/admin/knowledge", "POST", {
        title: "Audit me",
        text: "Short help text.",
        sourceType: "faq",
      }),
    );
    expect(res.status).toBe(201);
    const audits = await t.db
      .select()
      .from(s.auditLog)
      .where(eq(s.auditLog.action, "knowledge.created"));
    expect(audits.some((a) => a.actorId === f.contentManager.id)).toBe(true);
  });
});

describe("help request status does not leak details", () => {
  it("shows only the status to people who may not view the request", async () => {
    const [helpReq] = await t.db
      .select({ id: s.helpRequests.id })
      .from(s.helpRequests)
      .where(eq(s.helpRequests.profileId, f.learnerA.id));
    const id = helpReq!.id;

    as(null);
    const anon = await (
      await helpStatusRoute.GET(request(`/api/help/${id}/status`), ctx({ id }))
    ).json();
    expect(anon.status).toBeDefined();
    expect(anon.reason).toBeUndefined();
    expect(anon.summary).toBeUndefined();

    as(f.learnerB);
    const other = await (
      await helpStatusRoute.GET(request(`/api/help/${id}/status`), ctx({ id }))
    ).json();
    expect(other.reason).toBeUndefined();

    as(f.learnerA);
    const owner = await (
      await helpStatusRoute.GET(request(`/api/help/${id}/status`), ctx({ id }))
    ).json();
    expect(owner.reason).toBeDefined();
  });
});

describe("POST /api/help only summarizes your own conversation", () => {
  it("ignores someone else's conversationId", async () => {
    as(f.learnerB);
    const res = await helpRoute.POST(
      json("/api/help", "POST", { reason: "Need help", conversationId: f.conversationA.id }),
    );
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const [row] = await t.db.select().from(s.helpRequests).where(eq(s.helpRequests.id, id));
    expect(row?.summary).toBeNull();
  });
});

describe("POST /api/enrollments", () => {
  it("needs sign-in and never enrolls another profile", async () => {
    as(null);
    expect(
      (await enrollRoute.POST(json("/api/enrollments", "POST", { courseId: "fixture-course" })))
        .status,
    ).toBe(401);

    as(f.learnerB);
    const smuggled = await enrollRoute.POST(
      json("/api/enrollments", "POST", { courseId: "fixture-course", profileId: f.learnerA.id }),
    );
    expect(smuggled.status).toBe(400);
  });

  it("does not create courses from client input", async () => {
    as(f.learnerB);
    const res = await enrollRoute.POST(
      json("/api/enrollments", "POST", { courseId: "made-up-course", courseTitle: "Free stuff" }),
    );
    expect(res.status).toBe(404);
    expect(
      await t.db.select().from(s.courses).where(eq(s.courses.slug, "made-up-course")),
    ).toHaveLength(0);
  });
});

describe("helper transfer", () => {
  it("only transfers to a helper or admin", async () => {
    const [helpReq] = await t.db
      .select({ id: s.helpRequests.id })
      .from(s.helpRequests)
      .where(eq(s.helpRequests.profileId, f.learnerB.id));
    as(f.helper);
    const res = await transferRoute.POST(
      json(`/api/helper/requests/${helpReq!.id}/transfer`, "POST", {
        targetHelperId: f.learnerA.id,
      }),
      ctx({ id: helpReq!.id }),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/cron/retention", () => {
  it("refuses calls without the cron secret", async () => {
    expect((await retentionCron.GET(request("/api/cron/retention"))).status).toBe(401);
    expect(
      (
        await retentionCron.GET(
          request("/api/cron/retention", {
            headers: { authorization: "Bearer wrong-secret-123456" },
          }),
        )
      ).status,
    ).toBe(401);
  });

  it("runs the retention job with the right secret", async () => {
    const res = await retentionCron.GET(
      request("/api/cron/retention", {
        headers: { authorization: `Bearer ${getEnv().CRON_SECRET}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toHaveProperty("conversations");
    expect(body.deleted).toHaveProperty("voiceRecordings");
  });
});
