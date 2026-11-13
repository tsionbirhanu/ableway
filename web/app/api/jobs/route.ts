import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { jobs, knowledgeChunks } from "@/lib/db/schema";
import { withErrors, NotFoundError, BadRequestError } from "@/lib/auth/errors";
import { requireRole } from "@/lib/auth/session";
import { createJob, searchJobs, reviewReason, ingestJob, type JobInput } from "@/lib/jobs/service";

const jobSchema = z.object({ title: z.string().min(1), employer: z.string(), location: z.string().min(1), jobType: z.enum(["full_time", "part_time", "contract", "internship", "volunteer"]), description: z.string().default(""), requirements: z.string().min(1), howToApply: z.string().min(1), deadline: z.string().nullable().optional(), accessibilityNotes: z.string().nullable().optional(), status: z.enum(["draft", "published"]).optional() });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const offset = Math.max(0, Number.parseInt(params.get("offset") ?? "0", 10) || 0);
  const [job] = await searchJobs(getDb(), params.get("query") ?? "", params.get("location") ?? "", params.get("type") ?? "", offset);
  return Response.json({ job: job ?? null, nextOffset: job ? offset + 1 : null });
}

export const POST = withErrors(async (request: Request) => {
  await requireRole(["content_manager", "admin"]);
  const body = jobSchema.safeParse(await request.json());
  if (!body.success) throw new BadRequestError();
  const status = body.data.status === "published" ? "published" : "draft";
  const { status: _status, ...input } = body.data;
  const job = await createJob(getDb(), input as JobInput, status);
  return Response.json({ job }, { status: 201 });
});

export const PATCH = withErrors(async (request: Request) => {
  await requireRole(["content_manager", "admin"]);
  const body = z.object({ id: z.string().uuid(), ...jobSchema.partial().shape, status: z.enum(["draft", "published", "closed"]).optional() }).safeParse(await request.json());
  if (!body.success) throw new BadRequestError();
  const { id, status, ...fields } = body.data;
  const db = getDb();
  const [old] = await db.select().from(jobs).where(eq(jobs.id, id));
  if (!old) throw new NotFoundError();
  const merged = { ...old, ...fields };
  const reason = reviewReason(merged);
  const values = { ...fields, suspicious: Boolean(reason), reviewReason: reason, ...(status ? { status } : {}), ...(status === "published" && !old.publishedAt ? { publishedAt: new Date() } : {}) };
  const job = await db.transaction(async (tx) => {
    const [updated] = await tx.update(jobs).set(values).where(eq(jobs.id, id)).returning();
    if (updated.status === "published") await ingestJob(tx as never, updated);
    else if (updated.status === "closed") await tx.update(knowledgeChunks).set({ status: "draft" }).where(eq(knowledgeChunks.sourceId, updated.id));
    return updated;
  });
  return Response.json({ job });
});
