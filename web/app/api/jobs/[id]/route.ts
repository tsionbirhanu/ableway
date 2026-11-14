import { and, eq } from "drizzle-orm";
import { withApi } from "@/lib/api/handler";
import { NotFoundError } from "@/lib/auth/errors";
import { parseId } from "@/lib/auth/params";
import { getDb } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";

type RouteProps = { params: Promise<{ id: string }> };

/** One published job, as plain text ready to read aloud. */
export const GET = withApi({}, async (_request: Request, ctx: RouteProps) => {
  const id = parseId((await ctx.params).id);
  const [job] = await getDb()
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.status, "published"), eq(jobs.suspicious, false)));
  if (!job) throw new NotFoundError();
  return Response.json({
    text: [
      `Title: ${job.title}`,
      `Employer: ${job.employer}`,
      `Place: ${job.location}`,
      `Requirements: ${job.requirements}`,
      `How to apply: ${job.howToApply}`,
      `Deadline: ${job.deadline ?? "Not specified"}`,
    ].join("\n"),
  });
});
