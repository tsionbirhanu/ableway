import { asc, eq } from "drizzle-orm";
import { withApi } from "@/lib/api/handler";
import { getDb } from "@/lib/db/client";
import { courses } from "@/lib/db/schema";

/** GET /api/courses: published courses only. */
export const GET = withApi({}, async (_request: Request) => {
  const publishedCourses = await getDb()
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
