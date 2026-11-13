import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as s from "@/lib/db/schema";
import { defaultAccessibilitySettings } from "@/lib/db/json-types";
import { createTestDb, type TestDb } from "./test-db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

/** Run an insert that should fail, without leaving the connection in a bad state. */
async function expectRejected(run: () => Promise<unknown>, constraint: string) {
  await expect(run()).rejects.toSatisfy((error: unknown) => {
    const text = `${String(error)} ${String((error as { cause?: unknown }).cause ?? "")}`;
    return text.includes(constraint);
  });
}

async function newProfile(overrides: Partial<typeof s.profiles.$inferInsert> = {}) {
  const [row] = await t.db
    .insert(s.profiles)
    .values({ name: "Test Person", ...overrides })
    .returning();
  if (!row) throw new Error("insert failed");
  return row;
}

async function newCourse(slug: string) {
  const [row] = await t.db
    .insert(s.courses)
    .values({ slug, title: "T", description: "D", currency: "USD" })
    .returning();
  if (!row) throw new Error("insert failed");
  return row;
}

describe("profiles", () => {
  it("applies defaults: learner role, English, default accessibility", async () => {
    const p = await newProfile();
    expect(p.role).toBe("learner");
    expect(p.language).toBe("en");
    expect(p.accessibility).toEqual(defaultAccessibilitySettings);
  });

  it("rejects duplicate emails", async () => {
    await newProfile({ email: "dup@example.org" });
    await expectRejected(() => newProfile({ email: "dup@example.org" }), "profiles_email_unique");
  });

  it("rejects upper-case emails", async () => {
    await expectRejected(
      () => newProfile({ email: "Upper@Example.org" }),
      "profiles_email_lowercase",
    );
  });

  it("rejects phone numbers not in E.164 form", async () => {
    await expectRejected(() => newProfile({ phone: "0911 234 567" }), "profiles_phone_e164");
    await expect(newProfile({ phone: "+251911234567" })).resolves.toBeTruthy();
  });

  it("rejects an unknown role", async () => {
    await expect(
      t.client.query("insert into profiles (name, role) values ('x', 'superuser')"),
    ).rejects.toThrow(/invalid input value for enum profile_role/);
  });
});

describe("updated_at", () => {
  it("changes on a raw SQL update (trigger)", async () => {
    const p = await newProfile();
    await t.client.query("update profiles set updated_at = '2000-01-01' where id = $1", [p.id]);
    await t.client.query("update profiles set name = 'Renamed' where id = $1", [p.id]);
    const [row] = await t.db.select().from(s.profiles).where(eq(s.profiles.id, p.id));
    expect(row?.updatedAt.getUTCFullYear()).toBeGreaterThan(2000);
    expect(row?.createdAt).toEqual(p.createdAt);
  });
});

describe("content", () => {
  it("rejects a quiz answer outside the choices", async () => {
    const course = await newCourse("quiz-check");
    const [mod] = await t.db
      .insert(s.modules)
      .values({ courseId: course.id, title: "M", position: 1 })
      .returning();
    const [quiz] = await t.db
      .insert(s.quizzes)
      .values({ moduleId: mod!.id, title: "Q" })
      .returning();
    await expectRejected(
      () =>
        t.db.insert(s.quizQuestions).values({
          quizId: quiz!.id,
          position: 1,
          prompt: "P",
          choices: ["a", "b"],
          correctChoice: 2,
          explanation: "E",
        }),
      "quiz_questions_correct_choice_range",
    );
  });

  it("rejects two modules in the same position", async () => {
    const course = await newCourse("position-check");
    await t.db.insert(s.modules).values({ courseId: course.id, title: "A", position: 1 });
    await expectRejected(
      () => t.db.insert(s.modules).values({ courseId: course.id, title: "B", position: 1 }),
      "modules_course_position_key",
    );
  });

  it("rejects negative prices and lower-case currency codes", async () => {
    await expectRejected(
      () =>
        t.db
          .insert(s.courses)
          .values({ slug: "neg", title: "T", description: "D", currency: "USD", priceMinor: -1 }),
      "courses_price_not_negative",
    );
    await expectRejected(
      () =>
        t.db
          .insert(s.courses)
          .values({ slug: "cur", title: "T", description: "D", currency: "usd" }),
      "courses_currency_upper",
    );
  });

  it("rejects non-https audio URLs", async () => {
    const course = await newCourse("audio-check");
    const [mod] = await t.db
      .insert(s.modules)
      .values({ courseId: course.id, title: "M", position: 1 })
      .returning();
    await expectRejected(
      () =>
        t.db.insert(s.lessons).values({
          moduleId: mod!.id,
          title: "L",
          transcript: "T",
          position: 1,
          audioUrl: "http://insecure.example.org/a.mp3",
        }),
      "lessons_audio_url_https",
    );
  });
});

describe("enrollments and payments", () => {
  it("allows one enrollment per learner per course", async () => {
    const p = await newProfile();
    const c = await newCourse("enroll-once");
    await t.db.insert(s.enrollments).values({ profileId: p.id, courseId: c.id });
    await expectRejected(
      () => t.db.insert(s.enrollments).values({ profileId: p.id, courseId: c.id }),
      "enrollments_profile_course_key",
    );
  });

  it("requires confirmed_by and confirmed_at together", async () => {
    const p = await newProfile();
    const c = await newCourse("pay-check");
    const [e] = await t.db
      .insert(s.enrollments)
      .values({ profileId: p.id, courseId: c.id })
      .returning();
    await expectRejected(
      () =>
        t.db.insert(s.paymentRecords).values({
          enrollmentId: e!.id,
          amountMinor: 100,
          currency: "USD",
          method: "cash",
          confirmedAt: new Date(),
        }),
      "payment_records_confirmation_complete",
    );
  });

  it("has no column that could hold card or PIN details", async () => {
    const cols = await t.client.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'payment_records'",
    );
    const names = cols.rows.map((r) => r.column_name);
    for (const banned of ["card", "pin", "password", "reference", "details", "note"]) {
      expect(
        names.some((n) => n.includes(banned)),
        banned,
      ).toBe(false);
    }
  });
});

describe("telegram", () => {
  it("rejects a Telegram id linked twice", async () => {
    const a = await newProfile();
    const b = await newProfile();
    await t.db
      .insert(s.telegramLinks)
      .values({ profileId: a.id, telegramId: 5_000_000_001, consentAt: new Date() });
    await expectRejected(
      () =>
        t.db
          .insert(s.telegramLinks)
          .values({ profileId: b.id, telegramId: 5_000_000_001, consentAt: new Date() }),
      "telegram_links_telegram_id_unique",
    );
  });

  it("round-trips large Telegram ids as numbers", async () => {
    const p = await newProfile();
    const big = 7_999_999_999_999;
    await t.db
      .insert(s.telegramLinks)
      .values({ profileId: p.id, telegramId: big, consentAt: new Date() });
    const [row] = await t.db
      .select()
      .from(s.telegramLinks)
      .where(eq(s.telegramLinks.profileId, p.id));
    expect(row?.telegramId).toBe(big);
  });
});

describe("alerts", () => {
  it("never delivers the same job to the same subscription twice", async () => {
    const p = await newProfile();
    const [sub] = await t.db.insert(s.alertSubscriptions).values({ profileId: p.id }).returning();
    const [job] = await t.db
      .insert(s.jobs)
      .values({
        title: "J",
        employer: "E",
        location: "Remote",
        jobType: "full_time",
        requirements: "R",
        howToApply: "H",
      })
      .returning();
    await t.db
      .insert(s.alertDeliveries)
      .values({ subscriptionId: sub!.id, jobId: job!.id, channel: "telegram" });
    await expectRejected(
      () =>
        t.db
          .insert(s.alertDeliveries)
          .values({ subscriptionId: sub!.id, jobId: job!.id, channel: "telegram" }),
      "alert_deliveries_subscription_job_key",
    );
  });
});

describe("knowledge_chunks", () => {
  it("finds the nearest chunk by cosine distance", async () => {
    const vec = (hot: number) =>
      Array.from({ length: s.EMBEDDING_DIMENSIONS }, (_, i) => (i === hot ? 1 : 0.001));
    await t.db.insert(s.knowledgeChunks).values([
      {
        sourceType: "faq",
        title: "Payments",
        text: "How to pay",
        embedding: vec(0),
        status: "published",
      },
      {
        sourceType: "faq",
        title: "Telegram",
        text: "Link Telegram",
        embedding: vec(1),
        status: "published",
      },
    ]);
    const query = `[${vec(1).join(",")}]`;
    const [nearest] = await t.db
      .select({ title: s.knowledgeChunks.title })
      .from(s.knowledgeChunks)
      .where(eq(s.knowledgeChunks.status, "published"))
      .orderBy(sql`${s.knowledgeChunks.embedding} <=> ${query}::vector`)
      .limit(1);
    expect(nearest?.title).toBe("Telegram");
  });

  it("rejects embeddings of the wrong size", async () => {
    await expectRejected(
      () =>
        t.db
          .insert(s.knowledgeChunks)
          .values({ sourceType: "faq", title: "Bad", text: "x", embedding: [1, 2, 3] }),
      "expected 768 dimensions",
    );
  });
});
