import "server-only";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { Db } from "@/lib/db/types";
import { alertSubscriptions, jobs, knowledgeChunks } from "@/lib/db/schema";

export type JobInput = {
  title: string;
  employer: string;
  location: string;
  jobType: "full_time" | "part_time" | "contract" | "internship" | "volunteer";
  description: string;
  requirements: string;
  howToApply: string;
  deadline?: string | null;
  accessibilityNotes?: string | null;
};

export function reviewReason(job: JobInput): string | null {
  const text = `${job.description} ${job.requirements} ${job.howToApply}`;
  if (
    /\b(pay|send|transfer|deposit|registration)\s+(a\s+)?(fee|money|payment)\b|\bpay\s+to\s+apply\b/i.test(
      text,
    )
  )
    return "Requests money from applicants";
  if (!job.employer.trim()) return "Employer is missing";
  return null;
}

export async function createJob(db: Db, input: JobInput, status: "draft" | "published" = "draft") {
  const reason = reviewReason(input);
  return db.transaction(async (tx) => {
    const [job] = await tx
      .insert(jobs)
      .values({
        ...input,
        deadline: input.deadline ?? null,
        accessibilityNotes: input.accessibilityNotes ?? null,
        status,
        publishedAt: status === "published" ? new Date() : null,
        suspicious: Boolean(reason),
        reviewReason: reason,
      })
      .returning();
    if (status === "published") await ingestJob(tx as unknown as Db, job);
    return job;
  });
}

export async function ingestJob(db: Db, job: typeof jobs.$inferSelect) {
  const text = `${job.title}\nEmployer: ${job.employer}\nPlace: ${job.location}\nRequirements: ${job.requirements}\nHow to apply: ${job.howToApply}\nDeadline: ${job.deadline ?? "Not specified"}\n${job.description}`;
  await db
    .delete(knowledgeChunks)
    .where(and(eq(knowledgeChunks.sourceType, "job"), eq(knowledgeChunks.sourceId, job.id)));
  await db
    .insert(knowledgeChunks)
    .values({ sourceType: "job", sourceId: job.id, title: job.title, text, status: "published" });
}

export async function searchJobs(
  db: Db,
  query: string,
  location: string,
  type: string,
  offset = 0,
  limit = 1,
) {
  const filters = [eq(jobs.status, "published"), eq(jobs.suspicious, false)];
  if (query.trim())
    filters.push(
      or(
        ilike(jobs.title, `%${query}%`),
        ilike(jobs.employer, `%${query}%`),
        ilike(jobs.description, `%${query}%`),
      )!,
    );
  if (location.trim()) filters.push(ilike(jobs.location, `%${location}%`));
  if (type.trim()) filters.push(eq(jobs.jobType, type as typeof jobs.$inferSelect.jobType));
  return db
    .select()
    .from(jobs)
    .where(and(...filters))
    .orderBy(desc(jobs.publishedAt))
    .limit(Math.min(50, Math.max(1, limit)))
    .offset(Math.max(0, offset));
}

export function matchesSubscription(
  job: Pick<
    typeof jobs.$inferSelect,
    "title" | "employer" | "location" | "jobType" | "description" | "requirements"
  >,
  sub: Pick<typeof alertSubscriptions.$inferSelect, "keywords" | "location" | "jobType">,
): boolean {
  if (sub.location && !job.location.toLocaleLowerCase().includes(sub.location.toLocaleLowerCase()))
    return false;
  if (sub.jobType && job.jobType !== sub.jobType) return false;
  const haystack =
    `${job.title} ${job.employer} ${job.description} ${job.requirements}`.toLocaleLowerCase();
  return (
    !sub.keywords.length || sub.keywords.some((word) => haystack.includes(word.toLocaleLowerCase()))
  );
}
