import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { courses, enrollments } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { parseId } from "@/lib/auth/params";
import { canViewEnrollment } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";

/** One enrollment with its course title. Owner or admin only. */
export const GET = withErrors(
  async (_request: Request, ctx: RouteContext<"/api/enrollments/[id]">) => {
    const actor = await requireActor();
    const id = parseId((await ctx.params).id);

    const [enrollment] = await getDb()
      .select({
        id: enrollments.id,
        profileId: enrollments.profileId,
        courseId: enrollments.courseId,
        courseTitle: courses.title,
        status: enrollments.status,
        progress: enrollments.progress,
        lastPosition: enrollments.lastPosition,
        createdAt: enrollments.createdAt,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.id, id));
    if (!enrollment) throw new NotFoundError();

    authorize(canViewEnrollment(actor, enrollment));
    return Response.json({ enrollment });
  },
);
