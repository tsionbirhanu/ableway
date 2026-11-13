import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { createTestDb, type TestDb } from "../db/test-db";
import { askAssistant } from "@/lib/assistant";
import { registerLearner } from "@/lib/auth/accounts";
import { FakeEmbedder } from "@/lib/knowledge/embedder";

const state = vi.hoisted(() => ({ userId: null as string | null, db: null as unknown }));

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(async () => (state.userId ? { user: { id: state.userId } } : null)),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => state.db }));

const coursesRoute = await import("@/app/api/courses/route");
const singleCourseRoute = await import("@/app/api/courses/[id]/route");
const enrollRoute = await import("@/app/api/enrollments/route");
const helpRoute = await import("@/app/api/help/route");
const queueRoute = await import("@/app/api/helper/queue/route");
const acceptRoute = await import("@/app/api/helper/requests/[id]/accept/route");
const confirmPaymentRoute = await import("@/app/api/payments/confirm/route");
const handbackRoute = await import("@/app/api/helper/requests/[id]/handback/route");
const closeRoute = await import("@/app/api/helper/requests/[id]/close/route");

describe("End-to-End Learner Journey: Register -> Enroll -> Request Help -> Helper Accepts -> Confirms Payment -> Course Unlocks", () => {
  let t: TestDb;
  const fakeEmbedder = new FakeEmbedder();

  beforeAll(async () => {
    t = await createTestDb();
    state.db = t.db;
  }, 60000);

  afterAll(async () => {
    await t?.client.close();
  });

  const signInAs = (userId: string | null) => {
    state.userId = userId;
  };

  it("executes the entire path seamlessly with database persistence and handover", async () => {
    // -------------------------------------------------------------
    // Step 1: Create Published Course and Helper Staff
    // -------------------------------------------------------------
    const [course] = await t.db
      .insert(schema.courses)
      .values({
        slug: "data-analytics",
        title: "Data Analytics Masterclass",
        description: "Learn SQL, Python, and accessible business intelligence.",
        priceMinor: 50000,
        currency: "ETB",
        language: "en",
        status: "published",
      })
      .returning();

    expect(course).toBeDefined();

    // Verify GET /api/courses returns the published course
    const coursesRes = await coursesRoute.GET(new Request("http://localhost/api/courses"));
    expect(coursesRes.status).toBe(200);
    const { courses } = await coursesRes.json();
    expect(courses.some((c: any) => c.slug === "data-analytics")).toBe(true);

    // Verify GET /api/courses/[id] returns the published course
    const singleCourseRes = await singleCourseRoute.GET(
      new Request("http://localhost/api/courses/data-analytics"),
      { params: Promise.resolve({ id: "data-analytics" }) }
    );
    expect(singleCourseRes.status).toBe(200);
    const { course: fetchedCourse } = await singleCourseRes.json();
    expect(fetchedCourse.id).toBe(course.id);

    // Create staff helper profile
    const [helperProfile] = await t.db
      .insert(schema.profiles)
      .values({
        email: "helper.meron@ableway.org",
        name: "Meron Kebede",
        role: "helper",
      })
      .returning();

    // -------------------------------------------------------------
    // Step 2: Register a new Learner
    // -------------------------------------------------------------
    const learnerAccount = await registerLearner(
      t.db,
      {
        email: "learner.tsion@example.org",
        name: "Tsion Birhanu",
        password: "ValidPass123!Secure",
      },
      { ip: "127.0.0.1" }
    );

    expect(learnerAccount).toBeDefined();
    expect(learnerAccount.role).toBe("learner");
    signInAs(learnerAccount.id);

    // -------------------------------------------------------------
    // Step 3: Enroll in the Course (Status: pending_payment)
    // -------------------------------------------------------------
    const enrollReq = new Request("http://localhost/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: course.id,
        courseTitle: course.title,
        price: "500 ETB",
      }),
    });

    const enrollRes = await enrollRoute.POST(enrollReq);
    expect(enrollRes.status).toBe(201);
    const enrollData = await enrollRes.json();
    expect(enrollData.ok).toBe(true);
    expect(enrollData.status).toBe("pending_payment");
    expect(enrollData.enrollmentId).toBeDefined();

    const enrollmentId = enrollData.enrollmentId;

    // Verify in DB that status is pending_payment
    const [enrollmentInDb] = await t.db
      .select()
      .from(schema.enrollments)
      .where(eq(schema.enrollments.id, enrollmentId));
    expect(enrollmentInDb.status).toBe("pending_payment");

    // -------------------------------------------------------------
    // Step 4: Learner asks Assistant and requests Human Help
    // -------------------------------------------------------------
    const asstRes1 = await askAssistant({
      channel: "web",
      userId: learnerAccount.id,
      language: "en",
      text: "How do I pay 500 ETB for the Data Analytics course?",
      pageContext: { page: "/payment" },
      db: t.db,
      embedder: fakeEmbedder,
    });

    expect(asstRes1.reply).toBeDefined();
    expect(asstRes1.conversationId).toBeDefined();
    const conversationId = asstRes1.conversationId!;

    // Learner requests human helper via POST /api/help
    const helpReq = new Request("http://localhost/api/help", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "payment",
        trigger: "learner",
        reason: "I need assistance transferring via Telebirr.",
        page: "/payment",
        conversationId,
      }),
    });

    const helpRes = await helpRoute.POST(helpReq);
    expect(helpRes.status).toBe(201);
    const helpData = await helpRes.json();
    expect(helpData.id).toBeDefined();
    expect(helpData.status).toBe("waiting");
    expect(helpData.type).toBe("payment");
    const helpRequestId = helpData.id;

    // -------------------------------------------------------------
    // Step 5: Helper views Queue and Accepts the Request
    // -------------------------------------------------------------
    signInAs(helperProfile.id);

    // GET /api/helper/queue
    const queueRes = await queueRoute.GET(new Request("http://localhost/api/helper/queue"));
    expect(queueRes.status).toBe(200);
    const queueData = await queueRes.json();
    expect(queueData.queue.some((r: any) => r.id === helpRequestId)).toBe(true);

    // POST /api/helper/requests/[id]/accept
    const acceptReq = new Request(`http://localhost/api/helper/requests/${helpRequestId}/accept`, {
      method: "POST",
    });
    const acceptRes = await acceptRoute.POST(acceptReq, {
      params: Promise.resolve({ id: helpRequestId }),
    });
    expect(acceptRes.status).toBe(200);
    const acceptData = await acceptRes.json();
    expect(acceptData.status).toBe("in_progress");

    // Verify conversation.handled_by is set to 'helper'
    const [convAfterAccept] = await t.db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, conversationId));
    expect(convAfterAccept.handledBy).toBe("helper");

    // Verify Assistant stays silent when learner speaks while handled by helper
    const silentResult = await askAssistant({
      channel: "web",
      userId: learnerAccount.id,
      conversationId,
      text: "Is anyone there?",
      pageContext: { page: "/payment" },
      db: t.db,
      embedder: fakeEmbedder,
    });
    expect(silentResult.reply).toBe(""); // SILENT!

    // -------------------------------------------------------------
    // Step 6: Helper confirms Payment -> Course Unlocks!
    // -------------------------------------------------------------
    const confirmReq = new Request("http://localhost/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentId,
        amountMinor: 50000,
        currency: "ETB",
        method: "mobile_money",
      }),
    });

    const confirmRes = await confirmPaymentRoute.POST(confirmReq);
    expect(confirmRes.status).toBe(201);
    const confirmData = await confirmRes.json();
    expect(confirmData.payment.status).toBe("active");
    expect(confirmData.payment.notified).toBe(true);

    // Verify in DB that enrollment is now ACTIVE (course unlocked!)
    const [activeEnrollment] = await t.db
      .select()
      .from(schema.enrollments)
      .where(eq(schema.enrollments.id, enrollmentId));
    expect(activeEnrollment.status).toBe("active");

    // Verify payment record in DB
    const [paymentRecord] = await t.db
      .select()
      .from(schema.paymentRecords)
      .where(eq(schema.paymentRecords.enrollmentId, enrollmentId));
    expect(paymentRecord).toBeDefined();
    expect(paymentRecord.amountMinor).toBe(50000);
    expect(paymentRecord.method).toBe("mobile_money");
    expect(paymentRecord.confirmedBy).toBe(helperProfile.id);

    // Verify audit log entry
    const [auditEntry] = await t.db
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.action, "payment.confirmed"));
    expect(auditEntry).toBeDefined();
    expect(auditEntry.actorId).toBe(helperProfile.id);
    expect(auditEntry.target).toBe(`enrollments:${enrollmentId}`);

    // -------------------------------------------------------------
    // Step 7: Helper Handback -> Assistant Resumes
    // -------------------------------------------------------------
    const handbackReq = new Request(`http://localhost/api/helper/requests/${helpRequestId}/handback`, {
      method: "POST",
    });
    const handbackRes = await handbackRoute.POST(handbackReq, {
      params: Promise.resolve({ id: helpRequestId }),
    });
    expect(handbackRes.status).toBe(200);

    // Verify conversation.handled_by is restored to 'assistant'
    const [convAfterHandback] = await t.db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, conversationId));
    expect(convAfterHandback.handledBy).toBe("assistant");

    // Close the request with notes
    const closeReq = new Request(`http://localhost/api/helper/requests/${helpRequestId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Payment verified via Telebirr reference." }),
    });
    const closeRes = await closeRoute.POST(closeReq, {
      params: Promise.resolve({ id: helpRequestId }),
    });
    expect(closeRes.status).toBe(200);

    // Verify assistant answers again
    signInAs(learnerAccount.id);
    const resumeResult = await askAssistant({
      channel: "web",
      userId: learnerAccount.id,
      conversationId,
      text: "Thank you for the help!",
      pageContext: { page: "/learn/data-analytics" },
      db: t.db,
      embedder: fakeEmbedder,
    });
    expect(resumeResult.reply.length).toBeGreaterThan(0);
  }, 45000);
});
