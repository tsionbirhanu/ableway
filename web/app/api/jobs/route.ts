import { eq } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { queryInt } from "@/lib/api/schemas";
import { NotFoundError } from "@/lib/auth/errors";
import { parseQuery, readJson } from "@/lib/auth/params";
import { canManageJobs } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jobs, jobStatus, jobType, knowledgeChunks } from "@/lib/db/schema";
import { createJob, ingestJob, reviewReason, searchJobs, type JobInput } from "@/lib/jobs/service";

const text = (max: number) => z.string().trim().max(max);

const jobFields = {
  title: text(200).min(1),
  employer: text(200),
  location: text(200).min(1),
  jobType: z.enum(jobType.enumValues),
  description: text(10_000).default(""),
  requirements: text(5_000).min(1),
  howToApply: text(2_000).min(1),
  deadline: z.iso.date().nullable().optional(),
  accessibilityNotes: text(2_000).nullable().optional(),
};

const createSchema = z.strictObject({
  ...jobFields,
  status: z.enum(["draft", "published"]).default("draft"),
});

const updateSchema = z.strictObject({
  id: z.uuid(),
  ...z.strictObject(jobFields).partial().shape,
  status: z.enum(jobStatus.enumValues).optional(),
});

const searchQuery = z.strictObject({
  query: text(200).default(""),
  location: text(200).default(""),
  type: z.enum(jobType.enumValues).or(z.literal("")).default(""),
  offset: queryInt(0, 10_000, 0),
  limit: queryInt(1, 50, 10),
});

/**
 * A page of jobs. `job` is the first one, for clients (voice, Telegram) that
 * read one result at a time; `nextOffset` is null on the last page.
 */
export const GET = withApi({}, async (request: Request) => {
  const q = parseQuery(request, searchQuery);
  const list = await searchJobs(getDb(), q.query, q.location, q.type, q.offset, q.limit);
  return Response.json({
    job: list[0] ?? null,
    jobs: list,
    nextOffset: list.length === q.limit ? q.offset + q.limit : null,
  });
});

export const POST = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  authorize(canManageJobs(actor));
  const { status, ...input } = createSchema.parse(await readJson(request));
  const job = await createJob(getDb(), input as JobInput, status);
  return Response.json({ job }, { status: 201 });
});

export const PATCH = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  authorize(canManageJobs(actor));
  const { id, status, ...fields } = updateSchema.parse(await readJson(request));
  const db = getDb();

  const [old] = await db.select().from(jobs).where(eq(jobs.id, id));
  if (!old) throw new NotFoundError();
  const reason = reviewReason({ ...old, ...fields } as JobInput);
  const values = {
    ...fields,
    suspicious: Boolean(reason),
    reviewReason: reason,
    ...(status ? { status } : {}),
    ...(status === "published" && !old.publishedAt ? { publishedAt: new Date() } : {}),
  };

  const job = await db.transaction(async (tx) => {
    const [updated] = await tx.update(jobs).set(values).where(eq(jobs.id, id)).returning();
    if (!updated) throw new NotFoundError();
    if (updated.status === "published") await ingestJob(tx as never, updated);
    else if (updated.status === "closed") {
      await tx
        .update(knowledgeChunks)
        .set({ status: "draft" })
        .where(eq(knowledgeChunks.sourceId, updated.id));
    }
    return updated;
  });
  return Response.json({ job });
});
