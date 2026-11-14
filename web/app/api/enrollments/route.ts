import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { courseRef, isUuid } from "@/lib/api/schemas";
import { NotFoundError } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { canEnroll } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { emptyProgress } from "@/lib/db/json-types";
import { courses, enrollments } from "@/lib/db/schema";

/**
 * The learner is always the signed-in person. Older clients also send the
 * title and price they showed; those are accepted but ignored, because the
 * database is the only source of truth for what a course costs.
 */
const enrollSchema = z.strictObject({
  courseId: courseRef,
  courseTitle: z.string().trim().max(300).optional(),
  price: z.string().trim().max(50).optional(),
});

const priceText = (c: { priceMinor: number; currency: string }) =>
  c.priceMinor > 0 ? `${c.priceMinor / 100} ${c.currency}` : "Free";

/** POST /api/enrollments: enroll the signed-in learner in a published course (pending payment). */
export const POST = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  authorize(canEnroll(actor, actor.id));
  const body = enrollSchema.parse(await readJson(request));
  const db = getDb();

  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        isUuid(body.courseId) ? eq(courses.id, body.courseId) : eq(courses.slug, body.courseId),
        eq(courses.status, "published"),
      ),
    )
    .limit(1);
  if (!course) throw new NotFoundError("We could not find that course.");

  const [created] = await db
    .insert(enrollments)
    .values({
      profileId: actor.id,
      courseId: course.id,
      status: "pending_payment",
      progress: emptyProgress,
    })
    .onConflictDoNothing({ target: [enrollments.profileId, enrollments.courseId] })
    .returning();

  const enrollment =
    created ??
    (
      await db
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.profileId, actor.id), eq(enrollments.courseId, course.id)))
        .limit(1)
    )[0];
  if (!enrollment) throw new Error("Enrollment insert returned no row");

  return Response.json(
    {
      ok: true,
      enrollmentId: enrollment.id,
      courseId: course.id,
      courseTitle: course.title,
      price: priceText(course),
      status: enrollment.status,
      message: created
        ? `Successfully reserved enrollment for ${course.title}.`
        : `Enrollment exists with status ${enrollment.status}.`,
    },
    { status: created ? 201 : 200 },
  );
});
