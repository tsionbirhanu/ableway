import { count, eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as s from "@/lib/db/schema";
import {
  accessibilitySettingsSchema,
  enrollmentProgressSchema,
  lastPositionSchema,
  quizChoicesSchema,
} from "@/lib/db/json-types";
import { seed, type SeedSummary } from "@/lib/db/seed";
import { seedCourses, seedJobs, seedProfiles } from "@/lib/db/seed-data";
import { createTestDb, type TestDb } from "./test-db";

let t: TestDb;
let first: SeedSummary;
const seedDate = new Date("2026-01-10T12:00:00Z");

beforeAll(async () => {
  t = await createTestDb();
  first = await seed(t.db, seedDate);
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

async function countOf(table: PgTable) {
  const [row] = await t.db.select({ n: count() }).from(table);
  return row?.n ?? 0;
}

describe("seed", () => {
  it("creates 3 courses, 5 jobs, and the fake people", () => {
    expect(first.coursesCreated).toBe(3);
    expect(first.jobsCreated).toBe(5);
    expect(first.profilesCreated).toBe(seedProfiles.length);
    expect(first.enrollmentsCreated).toBe(3);
  });

  it("creates learners and helpers", async () => {
    const people = await t.db.select({ role: s.profiles.role }).from(s.profiles);
    const roles = people.map((p) => p.role);
    expect(roles.filter((r) => r === "learner").length).toBeGreaterThanOrEqual(3);
    expect(roles.filter((r) => r === "helper").length).toBeGreaterThanOrEqual(2);
  });

  it("gives every course modules, lessons with transcripts, and quizzes with questions", async () => {
    const courses = await t.db.query.courses.findMany();
    expect(courses).toHaveLength(3);
    for (const course of courses) {
      expect(course.status).toBe("published");
      const mods = await t.db.select().from(s.modules).where(eq(s.modules.courseId, course.id));
      expect(mods.length).toBeGreaterThan(0);
      for (const mod of mods) {
        const lessons = await t.db.select().from(s.lessons).where(eq(s.lessons.moduleId, mod.id));
        expect(lessons.length).toBeGreaterThan(0);
        for (const lesson of lessons) expect(lesson.transcript.length).toBeGreaterThan(20);
        const quizzes = await t.db.select().from(s.quizzes).where(eq(s.quizzes.moduleId, mod.id));
        expect(quizzes).toHaveLength(1);
        const questions = await t.db
          .select()
          .from(s.quizQuestions)
          .where(eq(s.quizQuestions.quizId, quizzes[0]!.id));
        expect(questions.length).toBeGreaterThan(0);
        for (const q of questions)
          expect(quizChoicesSchema.safeParse(q.choices).success).toBe(true);
      }
    }
  });

  it("stores jsonb values that pass their Zod schemas", async () => {
    for (const p of await t.db.select().from(s.profiles)) {
      expect(accessibilitySettingsSchema.safeParse(p.accessibility).success).toBe(true);
    }
    for (const e of await t.db.select().from(s.enrollments)) {
      expect(enrollmentProgressSchema.safeParse(e.progress).success).toBe(true);
      if (e.lastPosition) expect(lastPositionSchema.safeParse(e.lastPosition).success).toBe(true);
    }
  });

  it("sets job deadlines in the future relative to the seed date", async () => {
    const jobs = await t.db.select().from(s.jobs);
    expect(jobs).toHaveLength(seedJobs.length);
    for (const job of jobs) {
      expect(job.status).toBe("published");
      expect(job.deadline! > "2026-01-10").toBe(true);
    }
  });

  it("records the confirmed payment with the helper who confirmed it", async () => {
    const payments = await t.db.select().from(s.paymentRecords);
    expect(payments).toHaveLength(1);
    const [helper] = await t.db
      .select()
      .from(s.profiles)
      .where(eq(s.profiles.id, payments[0]!.confirmedBy!));
    expect(helper?.role).toBe("helper");
    expect(await countOf(s.auditLog)).toBe(1);
  });

  it("adds draft knowledge chunks without embeddings", async () => {
    const chunks = await t.db.select().from(s.knowledgeChunks);
    const lessonCount = seedCourses.flatMap((c) => c.modules.flatMap((m) => m.lessons)).length;
    expect(chunks).toHaveLength(seedCourses.length + lessonCount + seedJobs.length);
    for (const chunk of chunks) {
      expect(chunk.status).toBe("draft");
      expect(chunk.embedding).toBeNull();
    }
  });

  it("is safe to run again: nothing is duplicated", async () => {
    const before = {
      profiles: await countOf(s.profiles),
      courses: await countOf(s.courses),
      lessons: await countOf(s.lessons),
      jobs: await countOf(s.jobs),
      enrollments: await countOf(s.enrollments),
      chunks: await countOf(s.knowledgeChunks),
    };
    const second = await seed(t.db, seedDate);
    expect(second).toEqual({
      profilesCreated: 0,
      coursesCreated: 0,
      lessonsCreated: 0,
      questionsCreated: 0,
      jobsCreated: 0,
      enrollmentsCreated: 0,
      knowledgeChunksCreated: 0,
    });
    expect({
      profiles: await countOf(s.profiles),
      courses: await countOf(s.courses),
      lessons: await countOf(s.lessons),
      jobs: await countOf(s.jobs),
      enrollments: await countOf(s.enrollments),
      chunks: await countOf(s.knowledgeChunks),
    }).toEqual(before);
  });
});

describe("seed data", () => {
  it("uses only reserved example domains and fictional phone numbers", () => {
    for (const p of seedProfiles) {
      expect(p.email.endsWith("@example.org")).toBe(true);
      expect(p.phone).toMatch(/^\+155555501\d\d$/);
    }
  });

  it("keeps lesson sentences short (plain language)", () => {
    const sentences = seedCourses
      .flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.transcript)))
      .flatMap((text) => text.split(/(?<=[.!?])\s+/));
    for (const sentence of sentences) {
      expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(15);
    }
  });

  it("has valid quiz answers", () => {
    for (const q of seedCourses.flatMap((c) => c.modules.flatMap((m) => m.quiz.questions))) {
      expect(q.correctChoice).toBeLessThan(q.choices.length);
    }
  });
});
