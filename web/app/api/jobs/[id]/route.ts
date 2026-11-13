import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";

export const GET = withErrors(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const [job] = await getDb().select().from(jobs).where(and(eq(jobs.id, (await ctx.params).id), eq(jobs.status, "published"), eq(jobs.suspicious, false)));
  if (!job) throw new NotFoundError();
  return Response.json({ text: `Title: ${job.title}\nEmployer: ${job.employer}\nPlace: ${job.location}\nRequirements: ${job.requirements}\nHow to apply: ${job.howToApply}\nDeadline: ${job.deadline ?? "Not specified"}` });
});
