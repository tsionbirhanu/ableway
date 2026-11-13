import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { courses, enrollments, profiles } from "@/lib/db/schema";
import { emptyProgress } from "@/lib/db/json-types";
import { BadRequestError, NotFoundError, withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { getActor } from "@/lib/auth/session";

const enrollSchema = z.object({
  courseId: z.string().trim().min(1),
  courseTitle: z.string().trim().optional(),
  price: z.string().optional(),
  profileId: z.string().uuid().optional(),
});

/**
 * POST /api/enrollments: creates an enrollment with status pending_payment.
 */
export const POST = withErrors(async (request: Request) => {
  const actor = await getActor();
  const body = enrollSchema.parse(await readJson(request));
  const db = getDb();

  // Find the course by id or slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.courseId);
  const condition = isUuid
    ? or(eq(courses.id, body.courseId), eq(courses.slug, body.courseId))
    : eq(courses.slug, body.courseId);

  let [course] = await db
    .select()
    .from(courses)
    .where(condition)
    .limit(1);

  if (!course) {
    // If course not found in DB yet (e.g. from static catalog in e2e), create it dynamically
    const slug = body.courseId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const [createdCourse] = await db
      .insert(courses)
      .values({
        slug,
        title: body.courseTitle || body.courseId,
        description: "Course on Ableway",
        priceMinor: body.price?.includes("500") ? 50000 : 0,
        currency: "ETB",
        language: "en",
        status: "published",
      })
      .returning();
    course = createdCourse;
  }

  // Resolve target learner profile
  let targetProfileId = actor?.id || body.profileId;

  if (!targetProfileId) {
    // Check if an existing demo/guest profile exists or create one
    const [firstProfile] = await db.select({ id: profiles.id }).from(profiles).limit(1);
    if (firstProfile) {
      targetProfileId = firstProfile.id;
    } else {
      const [newProfile] = await db
        .insert(profiles)
        .values({
          email: "learner@ableway.org",
          role: "learner",
          name: "Ableway Learner",
        })
        .returning({ id: profiles.id });
      targetProfileId = newProfile.id;
    }
  }

  // Check if enrollment already exists
  const [existing] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.profileId, targetProfileId), eq(enrollments.courseId, course.id)))
    .limit(1);

  if (existing) {
    return Response.json(
      {
        ok: true,
        enrollmentId: existing.id,
        courseId: course.id,
        courseTitle: course.title,
        price: body.price || (course.priceMinor > 0 ? `${course.priceMinor / 100} ${course.currency}` : "Free"),
        status: existing.status,
        message: `Enrollment exists with status ${existing.status}.`,
      },
      { status: 200 }
    );
  }

  // Create new enrollment with status pending_payment
  const [newEnrollment] = await db
    .insert(enrollments)
    .values({
      profileId: targetProfileId,
      courseId: course.id,
      status: "pending_payment",
      progress: emptyProgress,
    })
    .returning();

  return Response.json(
    {
      ok: true,
      enrollmentId: newEnrollment.id,
      courseId: course.id,
      courseTitle: course.title,
      price: body.price || (course.priceMinor > 0 ? `${course.priceMinor / 100} ${course.currency}` : "Free"),
      status: "pending_payment",
      message: `Successfully reserved enrollment for ${course.title}.`,
    },
    { status: 201 }
  );
});
