import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "../db/test-db";
import { createAuthFixtures, type AuthFixtures } from "../helpers/auth-fixtures";

const state = vi.hoisted(() => ({ userId: null as string | null, db: null as unknown }));

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(async () => (state.userId ? { user: { id: state.userId } } : null)),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => state.db }));

const knowledgeListRoute = await import("@/app/api/admin/knowledge/route");
const knowledgeItemRoute = await import("@/app/api/admin/knowledge/[id]/route");
const knowledgeUnpublishRoute = await import("@/app/api/admin/knowledge/[id]/unpublish/route");
const unansweredRoute = await import("@/app/api/admin/unanswered/route");
const unansweredItemRoute = await import("@/app/api/admin/unanswered/[id]/route");

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

const ctx = <P extends Record<string, string>>(params: P) =>
  ({ params: Promise.resolve(params) }) as never;

const get = (path: string) => new Request(`http://test.local${path}`);
const post = (path: string, body: unknown) =>
  new Request(`http://test.local${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const patch = (path: string, body: unknown) =>
  new Request(`http://test.local${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const del = (path: string) =>
  new Request(`http://test.local${path}`, {
    method: "DELETE",
  });

describe("Admin Knowledge API (/api/admin/knowledge)", () => {
  it("blocks non-staff learners with 403 Forbidden", async () => {
    signInAs(f.learnerA);
    const res = await knowledgeListRoute.GET(get("/api/admin/knowledge"));
    expect(res.status).toBe(403);
  });

  it("blocks anonymous unauthenticated requests with 401 Unauthorized", async () => {
    signInAs(null);
    const res = await knowledgeListRoute.GET(get("/api/admin/knowledge"));
    expect(res.status).toBe(401);
  });

  it("allows content_manager and admin to list knowledge chunks", async () => {
    signInAs(f.contentManager);
    const res = await knowledgeListRoute.GET(get("/api/admin/knowledge"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.chunks)).toBe(true);
  });

  it("creates, edits, unpublishes, and versions entries taking effect immediately", async () => {
    signInAs(f.contentManager);

    // 1. Create entry
    const createRes = await knowledgeListRoute.POST(
      post("/api/admin/knowledge", {
        title: "Screen Reader Hotkeys Reference",
        text: "Use H to navigate headings. Use K to navigate links. Use B to navigate buttons.",
        sourceType: "help_article",
        language: "en",
        status: "published",
      }),
    );
    expect(createRes.status).toBe(201);
    const createdData = await createRes.json();
    expect(createdData.chunks.length).toBeGreaterThan(0);
    const chunkId = createdData.chunks[0].id;
    expect(createdData.chunks[0].version).toBe(1);

    // 2. Fetch single chunk
    const getRes = await knowledgeItemRoute.GET(
      get(`/api/admin/knowledge/${chunkId}`),
      ctx({ id: chunkId }),
    );
    expect(getRes.status).toBe(200);
    const singleData = await getRes.json();
    expect(singleData.chunk.title).toBe("Screen Reader Hotkeys Reference");

    // 3. Edit chunk text -> bumps version to 2
    const editRes = await knowledgeItemRoute.PATCH(
      patch(`/api/admin/knowledge/${chunkId}`, {
        text: "Use H to navigate headings. Use K for links. Use T for tables.",
      }),
      ctx({ id: chunkId }),
    );
    expect(editRes.status).toBe(200);
    const editData = await editRes.json();
    expect(editData.chunk.version).toBe(2);
    expect(editData.chunk.text).toContain("tables");

    // 4. Unpublish entry -> sets status to draft immediately
    const unpublishRes = await knowledgeUnpublishRoute.POST(
      post(`/api/admin/knowledge/${chunkId}/unpublish`, {}),
      ctx({ id: chunkId }),
    );
    expect(unpublishRes.status).toBe(200);
    const unpublishData = await unpublishRes.json();
    expect(unpublishData.success).toBe(true);
    expect(unpublishData.chunk.status).toBe("draft");

    // 5. Delete entry
    const deleteRes = await knowledgeItemRoute.DELETE(
      del(`/api/admin/knowledge/${chunkId}`),
      ctx({ id: chunkId }),
    );
    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.success).toBe(true);
  });
});

describe("Admin Unanswered Questions API (/api/admin/unanswered)", () => {
  it("blocks unauthenticated users with 401", async () => {
    signInAs(null);
    const res = await unansweredRoute.GET(get("/api/admin/unanswered"));
    expect(res.status).toBe(401);
  });

  it("refuses manual unanswered questions from the public", async () => {
    signInAs(null);
    const res = await unansweredRoute.POST(
      post("/api/admin/unanswered", { text: "spam", language: "en", channel: "web" }),
    );
    expect(res.status).toBe(401);
  });

  it("lists unanswered questions for staff and allows marking as resolved", async () => {
    // 1. Staff add a question by hand (the assistant records its own directly)
    signInAs(f.contentManager);
    const postRes = await unansweredRoute.POST(
      post("/api/admin/unanswered", {
        text: "Can I take the exam using a refreshable Braille display?",
        language: "en",
        channel: "web",
      }),
    );
    expect(postRes.status).toBe(201);
    const { question } = await postRes.json();
    expect(question.resolved).toBe(false);

    // 2. Staff views unanswered list
    const listRes = await unansweredRoute.GET(get("/api/admin/unanswered?resolved=false"));
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.questions.some((q: { id: string }) => q.id === question.id)).toBe(true);

    // 3. Staff marks as resolved
    const resolveRes = await unansweredItemRoute.PATCH(
      patch(`/api/admin/unanswered/${question.id}`, { resolved: true }),
      ctx({ id: question.id }),
    );
    expect(resolveRes.status).toBe(200);
    const resolvedData = await resolveRes.json();
    expect(resolvedData.question.resolved).toBe(true);
  });
});
