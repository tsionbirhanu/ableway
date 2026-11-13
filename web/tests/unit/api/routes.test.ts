import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as s from "@/lib/db/schema";
import { createTestDb, type TestDb } from "../db/test-db";
import { createAuthFixtures, type AuthFixtures } from "../helpers/auth-fixtures";

/**
 * Route handlers run for real against PGlite. Only two things are faked:
 * the Auth.js session (who is signed in) and getDb (which database).
 */
const state = vi.hoisted(() => ({ userId: null as string | null, db: null as unknown }));

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(async () => (state.userId ? { user: { id: state.userId } } : null)),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => state.db }));

const enrollmentRoute = await import("@/app/api/enrollments/[id]/route");
const messagesRoute = await import("@/app/api/conversations/[id]/messages/route");
const helpListRoute = await import("@/app/api/help-requests/route");
const helpItemRoute = await import("@/app/api/help-requests/[id]/route");
const paymentRoute = await import("@/app/api/payments/confirm/route");

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

const signInAs = (who: { id: string } | null) => {
  state.userId = who?.id ?? null;
};

// Next passes params as a Promise. The handlers only read params.
const ctx = <P extends Record<string, string>>(params: P) =>
  ({ params: Promise.resolve(params) }) as never;

const get = (path: string) => new Request(`http://test.local${path}`);
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://test.local${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const getEnrollment = (id: string) =>
  enrollmentRoute.GET(get(`/api/enrollments/${id}`), ctx({ id }));
const getMessages = (id: string) =>
  messagesRoute.GET(get(`/api/conversations/${id}/messages`), ctx({ id }));
const listHelp = () => helpListRoute.GET(get("/api/help-requests"));
const getHelp = (id: string) => helpItemRoute.GET(get(`/api/help-requests/${id}`), ctx({ id }));
const confirmPayment = (enrollmentId: string, extra: Record<string, unknown> = {}) =>
  paymentRoute.POST(
    post("/api/payments/confirm", {
      enrollmentId,
      amountMinor: 1000,
      currency: "USD",
      method: "mobile_money",
      ...extra,
    }),
  );

// ---------------------------------------------------------------------------

describe("unauthenticated calls return 401", () => {
  it.each([
    ["GET enrollment", () => getEnrollment(f.enrollmentA.id)],
    ["GET messages", () => getMessages(f.conversationA.id)],
    ["GET help request list", () => listHelp()],
    ["GET help request", () => getHelp(f.helpRequestA.id)],
    ["POST confirm payment", () => confirmPayment(f.enrollmentA.id)],
  ])("%s", async (_name, call) => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "unauthorized", message: "Please sign in first." },
    });
  });

  it("returns 401 (not 404) even for an id that is not a UUID", async () => {
    expect((await getEnrollment("not-a-uuid")).status).toBe(401);
  });

  it("returns 401 for a session whose profile was deleted", async () => {
    signInAs({ id: "00000000-0000-4000-8000-000000000000" });
    expect((await getEnrollment(f.enrollmentA.id)).status).toBe(401);
  });
});

describe("wrong-role calls return 403", () => {
  it.each([
    ["learner", () => f.learnerA],
    ["content manager", () => f.contentManager],
  ])("%s cannot list help requests", async (_name, who) => {
    signInAs(who());
    const res = await listHelp();
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });

  it.each([
    ["learner", () => f.learnerA],
    ["content manager", () => f.contentManager],
  ])("%s cannot confirm a payment", async (_name, who) => {
    signInAs(who());
    expect((await confirmPayment(f.enrollmentB.id)).status).toBe(403);
  });

  it("helper cannot read a learner's enrollment", async () => {
    signInAs(f.helper);
    expect((await getEnrollment(f.enrollmentA.id)).status).toBe(403);
  });

  it("helper cannot read a learner's messages", async () => {
    signInAs(f.helper);
    expect((await getMessages(f.conversationA.id)).status).toBe(403);
  });

  it("uses the role from the database, not the session", async () => {
    // Demote a helper: the very next request is refused.
    const [demoted] = await t.db
      .insert(s.profiles)
      .values({ name: "Former Helper", role: "helper" })
      .returning();
    signInAs(demoted!);
    expect((await listHelp()).status).toBe(200);
    await t.db.update(s.profiles).set({ role: "learner" }).where(eq(s.profiles.id, demoted!.id));
    expect((await listHelp()).status).toBe(403);
  });
});

describe("a learner cannot read another learner's data", () => {
  beforeEach(() => signInAs(f.learnerA));

  it("can read their own enrollment", async () => {
    const res = await getEnrollment(f.enrollmentA.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enrollment.id).toBe(f.enrollmentA.id);
    expect(body.enrollment.courseTitle).toBe("Fixture Course");
  });

  it("cannot read another learner's enrollment", async () => {
    const res = await getEnrollment(f.enrollmentB.id);
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain(f.learnerB.id);
  });

  it("can read their own messages", async () => {
    const res = await getMessages(f.conversationA.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages.map((m: { content: string }) => m.content)).toContain(
      "A's private message",
    );
  });

  it("cannot read another learner's messages", async () => {
    const res = await getMessages(f.conversationB.id);
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain("B's private message");
  });

  it("can read their own help request", async () => {
    const res = await getHelp(f.helpRequestA.id);
    expect(res.status).toBe(200);
    expect((await res.json()).helpRequest.summary).toBe("Summary for A");
  });

  it("cannot read another learner's help request", async () => {
    const res = await getHelp(f.helpRequestB.id);
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain("Summary for B");
  });

  it("cannot list the help queue", async () => {
    expect((await listHelp()).status).toBe(403);
  });

  it("cannot confirm a payment, even for their own enrollment", async () => {
    expect((await confirmPayment(f.enrollmentA.id)).status).toBe(403);
    expect((await confirmPayment(f.enrollmentB.id)).status).toBe(403);
    const payments = await t.db.select().from(s.paymentRecords);
    expect(payments).toHaveLength(0);
    const [a] = await t.db
      .select()
      .from(s.enrollments)
      .where(eq(s.enrollments.id, f.enrollmentA.id));
    expect(a?.status).toBe("pending_payment");
  });

  it("gets 404 for ids that do not exist or are not UUIDs", async () => {
    expect((await getEnrollment("00000000-0000-4000-8000-000000000001")).status).toBe(404);
    expect((await getEnrollment("1 or 1=1")).status).toBe(404);
  });
});

describe("helpers see help requests and summaries, not other personal data", () => {
  it("lists the queue with summaries", async () => {
    signInAs(f.helper);
    const res = await listHelp();
    expect(res.status).toBe(200);
    const { helpRequests } = await res.json();
    const summaries = helpRequests.map((h: { summary: string }) => h.summary);
    expect(summaries).toEqual(expect.arrayContaining(["Summary for A", "Summary for B"]));
  });

  it("sees contact details only on requests assigned to them", async () => {
    signInAs(f.helper);
    const assigned = (await (await getHelp(f.helpRequestA.id)).json()).helpRequest;
    expect(assigned.contact).toEqual({ phone: "+15555550201", email: "a@example.org" });

    const unassigned = (await (await getHelp(f.helpRequestB.id)).json()).helpRequest;
    expect(unassigned.contact).toBeNull();
    expect(JSON.stringify(unassigned)).not.toContain("+15555550202");
    expect(JSON.stringify(unassigned)).not.toContain("b@example.org");
  });

  it("another helper does not see contact details for a request assigned elsewhere", async () => {
    signInAs(f.otherHelper);
    const res = await getHelp(f.helpRequestA.id);
    expect(res.status).toBe(200);
    expect((await res.json()).helpRequest.contact).toBeNull();
  });

  it("admin sees contact details", async () => {
    signInAs(f.admin);
    const body = await (await getHelp(f.helpRequestB.id)).json();
    expect(body.helpRequest.contact.email).toBe("b@example.org");
  });
});

describe("POST /api/help-requests", () => {
  const create = (body: unknown, ip = "203.0.113.5") =>
    helpListRoute.POST(post("/api/help-requests", body, { "x-real-ip": ip }));

  it("works without signing in (help is always available)", async () => {
    const res = await create({ reason: "I cannot sign in" }, "203.0.113.10");
    expect(res.status).toBe(201);
    const { helpRequest } = await res.json();
    const [row] = await t.db
      .select()
      .from(s.helpRequests)
      .where(eq(s.helpRequests.id, helpRequest.id));
    expect(row?.profileId).toBeNull();
    expect(row?.trigger).toBe("learner");
  });

  it("links the request to the signed-in learner", async () => {
    signInAs(f.learnerB);
    const res = await create({ reason: "Help with a lesson", type: "general" }, "203.0.113.11");
    const { helpRequest } = await res.json();
    const [row] = await t.db
      .select()
      .from(s.helpRequests)
      .where(eq(s.helpRequests.id, helpRequest.id));
    expect(row?.profileId).toBe(f.learnerB.id);
  });

  it("rejects unknown fields (no smuggling a profile id or status)", async () => {
    signInAs(f.learnerA);
    const res = await create({ reason: "x", profileId: f.learnerB.id }, "203.0.113.12");
    expect(res.status).toBe(400);
    expect((await create({ reason: "x", status: "done" }, "203.0.113.12")).status).toBe(400);
  });

  it("rejects bad JSON with 400", async () => {
    expect((await create("{not json", "203.0.113.13")).status).toBe(400);
  });

  it("rate limits per IP", async () => {
    const ip = "198.51.100.77";
    for (let i = 0; i < 10; i++)
      expect((await create({ reason: `try ${i}` }, ip)).status).toBe(201);
    const blocked = await create({ reason: "one more" }, ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("POST /api/payments/confirm", () => {
  it("rejects fields like card numbers or PINs", async () => {
    signInAs(f.helper);
    const withCard = await confirmPayment(f.enrollmentB.id, { cardNumber: "4111111111111111" });
    expect(withCard.status).toBe(400);
    const withPin = await confirmPayment(f.enrollmentB.id, { pin: "1234" });
    expect(withPin.status).toBe(400);
    expect(await t.db.select().from(s.paymentRecords)).toHaveLength(0);
  });

  it("a helper cannot confirm a payment for their own enrollment", async () => {
    signInAs(f.helper);
    expect((await confirmPayment(f.helperEnrollment.id, { amountMinor: 500 })).status).toBe(403);
  });

  it("rejects the wrong currency", async () => {
    signInAs(f.helper);
    expect((await confirmPayment(f.enrollmentB.id, { currency: "EUR" })).status).toBe(400);
  });

  it("a helper confirms a payment: record, active enrollment, audit entry", async () => {
    signInAs(f.helper);
    const res = await confirmPayment(f.enrollmentB.id);
    expect(res.status).toBe(201);

    const [payment] = await t.db
      .select()
      .from(s.paymentRecords)
      .where(eq(s.paymentRecords.enrollmentId, f.enrollmentB.id));
    expect(payment?.confirmedBy).toBe(f.helper.id);
    expect(payment?.confirmedAt).toBeInstanceOf(Date);

    const [enrollment] = await t.db
      .select()
      .from(s.enrollments)
      .where(eq(s.enrollments.id, f.enrollmentB.id));
    expect(enrollment?.status).toBe("active");

    const audit = await t.db
      .select()
      .from(s.auditLog)
      .where(eq(s.auditLog.action, "payment.confirmed"));
    expect(audit.map((a) => a.target)).toContain(`enrollments:${f.enrollmentB.id}`);
  });

  it("cannot confirm the same enrollment twice", async () => {
    signInAs(f.admin);
    expect((await confirmPayment(f.enrollmentB.id)).status).toBe(409);
  });

  it("returns 404 for an unknown enrollment", async () => {
    signInAs(f.admin);
    expect((await confirmPayment("00000000-0000-4000-8000-000000000002")).status).toBe(404);
  });
});
