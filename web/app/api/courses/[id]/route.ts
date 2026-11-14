import { and, asc, eq } from "drizzle-orm";
import { withApi } from "@/lib/api/handler";
import { courseRef, isUuid } from "@/lib/api/schemas";
import { NotFoundError } from "@/lib/auth/errors";
import { getDb } from "@/lib/db/client";
import { courses, modules } from "@/lib/db/schema";

type RouteProps = { params: Promise<{ id: string }> };

/** GET /api/courses/[id]: one published course, by id or slug. */
export const GET = withApi({}, async (_request: Request, props: RouteProps) => {
  const parsed = courseRef.safeParse((await props.params).id);
  if (!parsed.success) throw new NotFoundError("Course not found or is currently unpublished.");
  const ref = parsed.data;
  const db = getDb();

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
    .where(
      and(
        isUuid(ref) ? eq(courses.id, ref) : eq(courses.slug, ref),
        eq(courses.status, "published"),
      ),
    )
    .limit(1);
  if (!course) throw new NotFoundError("Course not found or is currently unpublished.");

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
      priceFormatted:
        course.priceMinor > 0 ? `${course.priceMinor / 100} ${course.currency}` : "Free",
      modules: courseModules,
    },
  });
});
