import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { courses, enrollments, lessons, modules } from "@/lib/db/schema";
import { withApi } from "@/lib/api/handler";
import { requireActor } from "@/lib/auth/session";

/**
 * GET /api/learn/summary
 * Returns a short plain-language progress summary for the learner.
 */
export const GET = withApi({}, async (_request: Request) => {
  const actor = await requireActor();
  const db = getDb();

  const activeEnrollments = await db
    .select({
      enrollmentId: enrollments.id,
      courseId: enrollments.courseId,
      courseTitle: courses.title,
      progress: enrollments.progress,
      lastPosition: enrollments.lastPosition,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(and(eq(enrollments.profileId, actor.id), eq(enrollments.status, "active")));

  if (activeEnrollments.length === 0) {
    return Response.json({
      summary:
        "You are not currently enrolled in any active courses. Visit the courses page to get started.",
      activeCourseCount: 0,
      totalCompletedLessons: 0,
      courses: [],
    });
  }

  const courseSummaries = [];
  let totalCompleted = 0;
  let totalAllLessons = 0;

  for (const enr of activeEnrollments) {
    // Count total published lessons in this course
    const modRows = await db
      .select({ id: modules.id })
      .from(modules)
      .where(and(eq(modules.courseId, enr.courseId), eq(modules.status, "published")));

    const modIds = modRows.map((m) => m.id);

    const courseLessons =
      modIds.length > 0
        ? await db
            .select({ id: lessons.id, title: lessons.title })
            .from(lessons)
            .where(and(inArray(lessons.moduleId, modIds), eq(lessons.status, "published")))
            .orderBy(asc(lessons.position))
        : [];

    const completedIds = new Set(enr.progress?.completedLessonIds || []);
    const completedCount = completedIds.size;
    const courseLessonTotal = courseLessons.length;

    totalCompleted += completedCount;
    totalAllLessons += courseLessonTotal;

    const nextLesson = courseLessons.find((l) => !completedIds.has(l.id));

    courseSummaries.push({
      courseId: enr.courseId,
      courseTitle: enr.courseTitle,
      completedCount,
      totalLessons: courseLessonTotal,
      nextLessonTitle: nextLesson ? nextLesson.title : null,
      isFinished: courseLessonTotal > 0 && completedCount >= courseLessonTotal,
    });
  }

  // Create listening-friendly plain-language summary
  const primary = courseSummaries[0];
  let summaryText = "";

  if (primary.isFinished) {
    summaryText = `Congratulations! You have completed all ${primary.totalLessons} lessons in ${primary.courseTitle}.`;
  } else if (primary.nextLessonTitle) {
    summaryText = `You have completed ${primary.completedCount} of ${primary.totalLessons} lessons in ${primary.courseTitle}. Next up: ${primary.nextLessonTitle}.`;
  } else {
    summaryText = `You have started ${primary.courseTitle}. You have completed ${primary.completedCount} lessons so far.`;
  }

  return Response.json({
    summary: summaryText,
    activeCourseCount: activeEnrollments.length,
    totalCompletedLessons: totalCompleted,
    totalLessons: totalAllLessons,
    courses: courseSummaries,
  });
});
