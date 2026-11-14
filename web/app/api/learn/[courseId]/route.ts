import { and, asc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  courses,
  enrollments,
  lessons,
  modules,
  quizQuestions,
  quizzes,
} from "@/lib/db/schema";
import { ForbiddenError, NotFoundError, withErrors } from "@/lib/auth/errors";
import { requireActor } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/learn/[courseId]
 * Retrieves modules, lessons, and quizzes with progress, ONLY for active enrollments.
 * Correct answers and explanations for quizzes are strictly omitted for server-side grading.
 */
export const GET = withErrors(async (_request: Request, props: RouteProps) => {
  const actor = await requireActor();
  const { courseId } = await props.params;
  const db = getDb();

  // Find course by UUID or slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
  const condition = isUuid
    ? or(eq(courses.id, courseId), eq(courses.slug, courseId))
    : eq(courses.slug, courseId);

  const [course] = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      language: courses.language,
      status: courses.status,
    })
    .from(courses)
    .where(condition)
    .limit(1);

  if (!course) {
    throw new NotFoundError("Course not found.");
  }

  // Check enrollment: must be active
  const [enrollment] = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      progress: enrollments.progress,
      lastPosition: enrollments.lastPosition,
    })
    .from(enrollments)
    .where(and(eq(enrollments.profileId, actor.id), eq(enrollments.courseId, course.id)))
    .limit(1);

  if (!enrollment || enrollment.status !== "active") {
    throw new ForbiddenError(
      "You must have an active enrollment to access course lessons and quizzes. Please complete your enrollment."
    );
  }

  // Load published modules
  const moduleRows = await db
    .select({
      id: modules.id,
      title: modules.title,
      description: modules.description,
      position: modules.position,
    })
    .from(modules)
    .where(and(eq(modules.courseId, course.id), eq(modules.status, "published")))
    .orderBy(asc(modules.position));

  const moduleIds = moduleRows.map((m) => m.id);

  // Load published lessons
  const lessonRows =
    moduleIds.length > 0
      ? await db
          .select({
            id: lessons.id,
            moduleId: lessons.moduleId,
            title: lessons.title,
            transcript: lessons.transcript,
            audioUrl: lessons.audioUrl,
            durationSeconds: lessons.durationSeconds,
            position: lessons.position,
          })
          .from(lessons)
          .where(and(inArray(lessons.moduleId, moduleIds), eq(lessons.status, "published")))
          .orderBy(asc(lessons.position))
      : [];

  // Load published quizzes
  const quizRows =
    moduleIds.length > 0
      ? await db
          .select({
            id: quizzes.id,
            moduleId: quizzes.moduleId,
            lessonId: quizzes.lessonId,
            title: quizzes.title,
            passMark: quizzes.passMark,
          })
          .from(quizzes)
          .where(and(inArray(quizzes.moduleId, moduleIds), eq(quizzes.status, "published")))
      : [];

  const quizIds = quizRows.map((q) => q.id);

  // Load quiz questions WITHOUT correct answers or explanations
  const questionRows =
    quizIds.length > 0
      ? await db
          .select({
            id: quizQuestions.id,
            quizId: quizQuestions.quizId,
            position: quizQuestions.position,
            prompt: quizQuestions.prompt,
            choices: quizQuestions.choices,
            // Exclude correctChoice and explanation!
          })
          .from(quizQuestions)
          .where(inArray(quizQuestions.quizId, quizIds))
          .orderBy(asc(quizQuestions.position))
      : [];

  // Structure the response hierarchy
  const modulesWithContent = moduleRows.map((mod) => {
    const modLessons = lessonRows.filter((l) => l.moduleId === mod.id);
    const modQuizzes = quizRows
      .filter((q) => q.moduleId === mod.id)
      .map((q) => ({
        ...q,
        questions: questionRows.filter((ques) => ques.quizId === q.id),
      }));

    return {
      ...mod,
      lessons: modLessons,
      quizzes: modQuizzes,
    };
  });

  return Response.json({
    course,
    enrollmentId: enrollment.id,
    modules: modulesWithContent,
    progress: enrollment.progress,
    lastPosition: enrollment.lastPosition,
  });
});
