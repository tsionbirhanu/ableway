import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { courses } from "@/lib/db/schema";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";

const createCourseSchema = z.object({
  slug: z.string().trim().min(2).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  priceMinor: z.number().int().min(0).default(0),
  currency: z.string().trim().length(3).toUpperCase().default("ETB"),
  language: z.string().default("en"),
  status: z.enum(["draft", "published"]).default("draft"),
});

/**
 * GET /api/admin/content/courses: lists all courses (draft & published) for content managers.
 */
export const GET = withErrors(async () => {
  await requireRole(["content_manager", "admin"]);
  const db = getDb();
  const all = await db.select().from(courses).orderBy(asc(courses.slug));
  return Response.json({ courses: all });
});

/**
 * POST /api/admin/content/courses: creates a new course.
 */
export const POST = withErrors(async (request: Request) => {
  await requireRole(["content_manager", "admin"]);
  const body = createCourseSchema.parse(await readJson(request));
  const db = getDb();

  const [created] = await db
    .insert(courses)
    .values(body)
    .returning();

  return Response.json({ course: created }, { status: 201 });
});

