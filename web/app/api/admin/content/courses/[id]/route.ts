import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { courses } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/auth/errors";
import { withApi } from "@/lib/api/handler";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const updateCourseSchema = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).optional(),
  priceMinor: z.number().int().min(0).optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  language: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

/**
 * PATCH /api/admin/content/courses/[id]: updates an existing course.
 */
export const PATCH = withApi({}, async (request: Request, props: RouteProps) => {
  await requireRole(["content_manager", "admin"]);
  const { id } = await props.params;
  const body = updateCourseSchema.parse(await readJson(request));
  const db = getDb();

  const [existing] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!existing) throw new NotFoundError("Course not found.");

  const [updated] = await db
    .update(courses)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, id))
    .returning();

  return Response.json({ course: updated });
});
