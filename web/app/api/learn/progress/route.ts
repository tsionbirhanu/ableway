import { and, asc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { courses, enrollments, lessons, modules } from "@/lib/db/schema";
import { ForbiddenError, NotFoundError } from "@/lib/auth/errors";
import { withApi } from "@/lib/api/handler";
import { readJson } from "@/lib/auth/params";
import { requireActor } from "@/lib/auth/session";

const progressInputSchema = z.strictObject({
  courseId: z.string().trim().min(1),
  lastPosition: z
    .object({
      lessonId: z.string().uuid(),
      audioSeconds: z.number().min(0),
    })
    .optional(),
  completedLessonId: z.string().uuid().optional(),
  quizResult: z
    .object({
      quizId: z.string().uuid(),
      bestScore: z.number().int().min(0).max(100),
      passed: z.boolean(),
    })
    .optional(),
});

/**
 * POST /api/learn/progress
 * Saves learner position, completed lessons, and quiz scores.
 */
export const POST = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  const body = progressInputSchema.parse(await readJson(request));
  const db = getDb();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    body.courseId,
  );
  const courseCond = isUuid
    ? or(eq(courses.id, body.courseId), eq(courses.slug, body.courseId))
    : eq(courses.slug, body.courseId);

  const [course] = await db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(courseCond)
    .limit(1);

  if (!course) {
    throw new NotFoundError("Course not found.");
  }

  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.profileId, actor.id), eq(enrollments.courseId, course.id)))
    .limit(1);

  if (!enrollment || enrollment.status !== "active") {
    throw new ForbiddenError("Active enrollment required to save progress.");
  }

  const currentProgress = enrollment.progress || { completedLessonIds: [], quizResults: {} };
  const completedSet = new Set(currentProgress.completedLessonIds || []);

  if (body.completedLessonId) {
    completedSet.add(body.completedLessonId);
  }

  const quizResults = { ...(currentProgress.quizResults || {}) };
  if (body.quizResult) {
    const existing = quizResults[body.quizResult.quizId];
    quizResults[body.quizResult.quizId] = {
      bestScore: Math.max(existing?.bestScore || 0, body.quizResult.bestScore),
      passed: existing?.passed || false || body.quizResult.passed,
      attempts: (existing?.attempts || 0) + 1,
    };
  }

  const newProgress = {
    completedLessonIds: Array.from(completedSet),
    quizResults,
  };

  const newLastPosition = body.lastPosition ?? enrollment.lastPosition ?? null;

  const [updated] = await db
    .update(enrollments)
    .set({
      progress: newProgress,
      lastPosition: newLastPosition,
    })
    .where(eq(enrollments.id, enrollment.id))
    .returning();

  return Response.json({
    ok: true,
    progress: updated.progress,
    lastPosition: updated.lastPosition,
    message: "Learning progress saved successfully.",
  });
});

/**
 * GET /api/learn/progress
 * Returns where to resume and current completion status.
 */
export const GET = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  const { searchParams } = new URL(request.url);
  const courseIdParam = searchParams.get("courseId");
  const db = getDb();

  // If courseId provided, return for specific course, otherwise latest active enrollment
  let query = db
    .select({
      enrollmentId: enrollments.id,
      courseId: enrollments.courseId,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      status: enrollments.status,
      progress: enrollments.progress,
      lastPosition: enrollments.lastPosition,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(eq(enrollments.profileId, actor.id));

  if (courseIdParam) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      courseIdParam,
    );
    const cond = isUuid
      ? or(eq(courses.id, courseIdParam), eq(courses.slug, courseIdParam))
      : eq(courses.slug, courseIdParam);
    query = db
      .select({
        enrollmentId: enrollments.id,
        courseId: enrollments.courseId,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        status: enrollments.status,
        progress: enrollments.progress,
        lastPosition: enrollments.lastPosition,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(and(eq(enrollments.profileId, actor.id), cond));
  }

  const [enrollment] = await query.limit(1);

  if (!enrollment) {
    throw new NotFoundError("No enrollment found.");
  }

  if (enrollment.status !== "active") {
    throw new ForbiddenError("Active enrollment required.");
  }

  // Load course modules and lessons
  const moduleRows = await db
    .select({ id: modules.id })
    .from(modules)
    .where(and(eq(modules.courseId, enrollment.courseId), eq(modules.status, "published")))
    .orderBy(asc(modules.position));

  const modIds = moduleRows.map((m) => m.id);

  const allLessons =
    modIds.length > 0
      ? await db
          .select({
            id: lessons.id,
            title: lessons.title,
            position: lessons.position,
            moduleId: lessons.moduleId,
          })
          .from(lessons)
          .where(and(inArray(lessons.moduleId, modIds), eq(lessons.status, "published")))
          .orderBy(asc(lessons.position))
      : [];

  const completedIds = new Set(enrollment.progress?.completedLessonIds || []);

  let resumeLessonId: string | null = null;
  let resumeAudioSeconds = 0;

  if (enrollment.lastPosition?.lessonId) {
    resumeLessonId = enrollment.lastPosition.lessonId;
    resumeAudioSeconds = enrollment.lastPosition.audioSeconds || 0;
  } else {
    // First uncompleted lesson
    const nextUncompleted = allLessons.find((l) => !completedIds.has(l.id));
    resumeLessonId = nextUncompleted ? nextUncompleted.id : allLessons[0]?.id || null;
  }

  const nextLesson = allLessons.find((l) => l.id === resumeLessonId) || null;

  return Response.json({
    courseId: enrollment.courseId,
    courseTitle: enrollment.courseTitle,
    courseSlug: enrollment.courseSlug,
    resumeLessonId,
    resumeAudioSeconds,
    nextLesson,
    lastPosition: enrollment.lastPosition,
    progress: enrollment.progress,
    completedCount: completedIds.size,
    totalLessons: allLessons.length,
    isCompleted: allLessons.length > 0 && completedIds.size >= allLessons.length,
  });
});
