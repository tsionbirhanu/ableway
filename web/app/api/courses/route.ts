import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { courses } from "@/lib/db/schema";
import { withErrors } from "@/lib/auth/errors";

/**
 * GET /api/courses: lists all published courses.
 * Returns published courses only.
 */
export const GET = withErrors(async (_request: Request) => {
  const db = getDb();
  const publishedCourses = await db
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
    .where(eq(courses.status, "published"))
    .orderBy(asc(courses.slug));

  return Response.json({
    courses: publishedCourses.map((c) => ({
      ...c,
      priceFormatted: c.priceMinor > 0 ? `${c.priceMinor / 100} ${c.currency}` : "Free",
    })),
  });
});
