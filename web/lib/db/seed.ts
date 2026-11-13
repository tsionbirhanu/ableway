import { and, eq } from "drizzle-orm";
import type { Db, Tx } from "./types";
import {
  emptyProgress,
  enrollmentProgressSchema,
  lastPositionSchema,
  quizChoicesSchema,
} from "./json-types";
import * as schema from "./schema";
import { SEED_CURRENCY, seedCourses, seedJobs, seedProfiles, type SeedCourse } from "./seed-data";

/** Any Drizzle Postgres database built with our schema (Neon, PGlite, node-postgres). */
export type SeedDb = Db;

export type SeedSummary = {
  profilesCreated: number;
  coursesCreated: number;
  lessonsCreated: number;
  questionsCreated: number;
  jobsCreated: number;
  enrollmentsCreated: number;
  knowledgeChunksCreated: number;
};

/**
 * Insert sample data. Safe to run more than once: rows that already exist
 * (matched by email, course slug, or job title + employer) are skipped.
 * Everything runs in one transaction, so a failure leaves no partial data.
 */
export async function seed(db: SeedDb, now: Date = new Date()): Promise<SeedSummary> {
  return db.transaction(async (tx) => {
    const summary: SeedSummary = {
      profilesCreated: 0,
      coursesCreated: 0,
      lessonsCreated: 0,
      questionsCreated: 0,
      jobsCreated: 0,
      enrollmentsCreated: 0,
      knowledgeChunksCreated: 0,
    };

    // ---- People ----
    const profileIds = new Map<string, string>();
    for (const person of seedProfiles) {
      const [inserted] = await tx
        .insert(schema.profiles)
        .values(person)
        .onConflictDoNothing({ target: schema.profiles.email })
        .returning({ id: schema.profiles.id });
      if (inserted) {
        summary.profilesCreated++;
        profileIds.set(person.email, inserted.id);
      } else {
        const [existing] = await tx
          .select({ id: schema.profiles.id })
          .from(schema.profiles)
          .where(eq(schema.profiles.email, person.email));
        if (!existing) throw new Error(`Seed: could not find profile ${person.email}`);
        profileIds.set(person.email, existing.id);
      }
    }
    const idFor = (email: string) => {
      const id = profileIds.get(email);
      if (!id) throw new Error(`Seed: unknown profile ${email}`);
      return id;
    };

    // ---- Courses ----
    const courseIds = new Map<string, { id: string; firstLessonId: string; firstQuizId: string }>();
    for (const course of seedCourses) {
      const [existing] = await tx
        .select({ id: schema.courses.id })
        .from(schema.courses)
        .where(eq(schema.courses.slug, course.slug));
      if (existing) continue;
      const created = await insertCourse(tx, course, summary);
      courseIds.set(course.slug, created);
      summary.coursesCreated++;
    }

    // ---- Jobs ----
    for (const job of seedJobs) {
      const [existing] = await tx
        .select({ id: schema.jobs.id })
        .from(schema.jobs)
        .where(and(eq(schema.jobs.title, job.title), eq(schema.jobs.employer, job.employer)));
      if (existing) continue;
      const { deadlineInDays, ...values } = job;
      const [created] = await tx
        .insert(schema.jobs)
        .values({ ...values, deadline: addDays(now, deadlineInDays), status: "published" })
        .returning({ id: schema.jobs.id });
      if (!created) throw new Error(`Seed: could not insert job ${job.title}`);
      await tx.insert(schema.knowledgeChunks).values({
        sourceType: "job",
        sourceId: created.id,
        title: job.title,
        text: `${job.title} at ${job.employer}. ${job.description} ${job.requirements}`,
      });
      summary.knowledgeChunksCreated++;
      summary.jobsCreated++;
    }

    // ---- Learner activity (only for courses created in this run) ----
    const basics = courseIds.get("computer-basics-screen-reader");
    const work = courseIds.get("getting-ready-for-work");
    const abebe = idFor("abebe.learner@example.org");
    const grace = idFor("grace.learner@example.org");
    const hana = idFor("hana.helper@example.org");

    if (basics) {
      const progress = enrollmentProgressSchema.parse({
        completedLessonIds: [basics.firstLessonId],
        quizResults: { [basics.firstQuizId]: { bestScore: 100, passed: true, attempts: 1 } },
      });
      const lastPosition = lastPositionSchema.parse({
        lessonId: basics.firstLessonId,
        audioSeconds: 0,
      });
      const [enrollment] = await tx
        .insert(schema.enrollments)
        .values({ profileId: abebe, courseId: basics.id, status: "active", progress, lastPosition })
        .onConflictDoNothing()
        .returning({ id: schema.enrollments.id });
      if (enrollment) summary.enrollmentsCreated++;
    }

    if (work) {
      const [enrollment] = await tx
        .insert(schema.enrollments)
        .values({
          profileId: grace,
          courseId: work.id,
          status: "pending_payment",
          progress: emptyProgress,
        })
        .onConflictDoNothing()
        .returning({ id: schema.enrollments.id });
      if (enrollment) {
        summary.enrollmentsCreated++;
        // Payment not done yet: a helper will call Grace to complete it.
        await tx.insert(schema.helpRequests).values({
          profileId: grace,
          type: "payment",
          trigger: "assistant",
          reason: "Learner wants to pay for Getting Ready for Work.",
          summary: "Grace chose the course. She needs help to pay by mobile money.",
          status: "assigned",
          assignedHelperId: hana,
          channel: "phone",
          page: "/courses/getting-ready-for-work",
        });
      }
    }

    // Grace already paid for TalkBack: a confirmed payment, recorded by a helper.
    const talkback = courseIds.get("smartphone-with-talkback");
    if (talkback) {
      const [enrollment] = await tx
        .insert(schema.enrollments)
        .values({
          profileId: grace,
          courseId: talkback.id,
          status: "active",
          progress: emptyProgress,
        })
        .onConflictDoNothing()
        .returning({ id: schema.enrollments.id });
      if (enrollment) {
        summary.enrollmentsCreated++;
        const talkbackCourse = seedCourses.find((c) => c.slug === "smartphone-with-talkback");
        await tx.insert(schema.paymentRecords).values({
          enrollmentId: enrollment.id,
          amountMinor: talkbackCourse?.priceMinor ?? 0,
          currency: SEED_CURRENCY,
          method: "mobile_money",
          confirmedBy: hana,
          confirmedAt: now,
        });
        await tx.insert(schema.auditLog).values({
          actorId: hana,
          action: "payment.confirmed",
          target: `enrollments:${enrollment.id}`,
          metadata: { method: "mobile_money", seeded: true },
        });
      }
    }

    if (summary.profilesCreated > 0) {
      await tx.insert(schema.alertSubscriptions).values({
        profileId: abebe,
        keywords: ["customer support", "call centre"],
        location: "Remote",
        channel: "telegram",
      });
      await tx.insert(schema.unansweredQuestions).values({
        text: "Can I take the course in Amharic?",
        language: "en",
        channel: "web",
      });
    }

    return summary;
  });
}

async function insertCourse(tx: Tx, course: SeedCourse, summary: SeedSummary) {
  const [created] = await tx
    .insert(schema.courses)
    .values({
      slug: course.slug,
      title: course.title,
      description: course.description,
      priceMinor: course.priceMinor,
      currency: SEED_CURRENCY,
      status: "published",
    })
    .returning({ id: schema.courses.id });
  if (!created) throw new Error(`Seed: could not insert course ${course.slug}`);

  await tx.insert(schema.knowledgeChunks).values({
    sourceType: "course",
    sourceId: created.id,
    title: course.title,
    text: course.description,
  });
  summary.knowledgeChunksCreated++;

  let firstLessonId: string | undefined;
  let firstQuizId: string | undefined;

  for (const [moduleIndex, mod] of course.modules.entries()) {
    const [moduleRow] = await tx
      .insert(schema.modules)
      .values({
        courseId: created.id,
        title: mod.title,
        description: mod.description,
        position: moduleIndex + 1,
        status: "published",
      })
      .returning({ id: schema.modules.id });
    if (!moduleRow) throw new Error(`Seed: could not insert module ${mod.title}`);

    for (const [lessonIndex, lesson] of mod.lessons.entries()) {
      const [lessonRow] = await tx
        .insert(schema.lessons)
        .values({
          ...lesson,
          moduleId: moduleRow.id,
          position: lessonIndex + 1,
          status: "published",
        })
        .returning({ id: schema.lessons.id });
      if (!lessonRow) throw new Error(`Seed: could not insert lesson ${lesson.title}`);
      firstLessonId ??= lessonRow.id;
      summary.lessonsCreated++;

      // Draft chunk with no embedding yet.
      // TODO: embed with Gemini (768 dimensions) and publish, once lib/knowledge exists.
      await tx.insert(schema.knowledgeChunks).values({
        sourceType: "lesson",
        sourceId: lessonRow.id,
        title: lesson.title,
        text: lesson.transcript,
      });
      summary.knowledgeChunksCreated++;
    }

    const [quizRow] = await tx
      .insert(schema.quizzes)
      .values({ moduleId: moduleRow.id, title: mod.quiz.title, status: "published" })
      .returning({ id: schema.quizzes.id });
    if (!quizRow) throw new Error(`Seed: could not insert quiz ${mod.quiz.title}`);
    firstQuizId ??= quizRow.id;

    for (const [questionIndex, question] of mod.quiz.questions.entries()) {
      await tx.insert(schema.quizQuestions).values({
        quizId: quizRow.id,
        position: questionIndex + 1,
        prompt: question.prompt,
        choices: quizChoicesSchema.parse(question.choices),
        correctChoice: question.correctChoice,
        explanation: question.explanation,
      });
      summary.questionsCreated++;
    }
  }

  if (!firstLessonId || !firstQuizId) {
    throw new Error(`Seed: course ${course.slug} needs at least one lesson and one quiz`);
  }
  return { id: created.id, firstLessonId, firstQuizId };
}

/** YYYY-MM-DD, in UTC. */
function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
