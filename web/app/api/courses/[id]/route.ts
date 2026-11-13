import { and, asc, eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { courses, modules } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/courses/[id]: returns a single published course by ID or slug.
 * Returns published courses only.
 */
export const GET = withErrors(async (_request: Request, props: RouteProps) => {
  const { id } = await props.params;
  const db = getDb();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const condition = isUuid
    ? or(eq(courses.id, id), eq(courses.slug, id))
    : eq(courses.slug, id);

  const [course] = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      priceMinor: courses.priceMinor,
      currency: courses.currency,
      language: courses.language,
      status: courses.status,
    })
    .from(courses)
    .where(and(condition, eq(courses.status, "published")))
    .limit(1);

  if (!course) {
    throw new NotFoundError("Course not found or is currently unpublished.");
  }

  // Fetch course modules
  const courseModules = await db
    .select({
      id: modules.id,
      title: modules.title,
      description: modules.description,
      position: modules.position,
      status: modules.status,
    })
    .from(modules)
    .where(and(eq(modules.courseId, course.id), eq(modules.status, "published")))
    .orderBy(asc(modules.position));

  return Response.json({
    course: {
      ...course,
      priceFormatted: course.priceMinor > 0 ? `${course.priceMinor / 100} ${course.currency}` : "Free",
      modules: courseModules,
    },
  });
});
