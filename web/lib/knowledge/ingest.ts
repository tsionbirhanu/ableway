import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { knowledgeChunks, courses, lessons, jobs, modules } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { splitIntoChunks } from "./chunker";
import { getEmbedder } from "./embedder";
import { STATIC_KNOWLEDGE_SOURCES } from "./static-sources";
import type { Embedder, IngestSource, KnowledgeChunk } from "./types";

export interface IngestOptions {
  embedder?: Embedder;
  db?: Db | any;
}

/**
 * Ingests a text source into knowledge_chunks.
 * 1. Splits text into chunks of 300 to 500 words with overlap.
 * 2. Creates 768-dimensional embeddings using the Gemini/mock embedder.
 * 3. Upserts into knowledge_chunks with language, source, version, and status.
 */
export async function ingest(
  source: IngestSource,
  options: IngestOptions = {}
): Promise<KnowledgeChunk[]> {
  const db = options.db ?? getDb();
  const embedder = options.embedder ?? getEmbedder();

  const textChunks = splitIntoChunks(source.text);
  if (textChunks.length === 0) {
    return [];
  }

  // Generate 768-dimensional embeddings, including the title for high-level semantic context
  const textsToEmbed = textChunks.map((chunk) => `${source.title}\n${chunk}`);
  const embeddings = await embedder.embedBatch(textsToEmbed);

  const language = source.language ?? "en";
  const status = source.status ?? "published";

  // Determine version: if version is specified, use it; otherwise increment or default to 1.
  let version = source.version;
  if (version === undefined) {
    if (source.sourceId) {
      const existing = await db
        .select({ version: knowledgeChunks.version })
        .from(knowledgeChunks)
        .where(
          and(
            eq(knowledgeChunks.sourceType, source.sourceType),
            eq(knowledgeChunks.sourceId, source.sourceId)
          )
        )
        .limit(1);

      version = existing.length > 0 && existing[0]?.version ? existing[0].version + 1 : 1;
    } else {
      version = 1;
    }
  }

  // Upsert: If a sourceId exists, delete old chunks for this source to cleanly replace with new version.
  if (source.sourceId) {
    await db
      .delete(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.sourceType, source.sourceType),
          eq(knowledgeChunks.sourceId, source.sourceId)
        )
      );
  } else {
    // For help articles without sourceId, replace if title and language match
    await db
      .delete(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.sourceType, source.sourceType),
          eq(knowledgeChunks.title, source.title),
          eq(knowledgeChunks.language, language)
        )
      );
  }

  const insertedRows: KnowledgeChunk[] = [];

  for (let i = 0; i < textChunks.length; i++) {
    const chunkText = textChunks[i];
    const chunkTitle =
      textChunks.length > 1 ? `${source.title} (Part ${i + 1})` : source.title;
    const embedding = embeddings[i] ?? new Array(embedder.dimensions).fill(0);

    const [row] = await db
      .insert(knowledgeChunks)
      .values({
        sourceType: source.sourceType,
        sourceId: source.sourceId ?? null,
        language,
        title: chunkTitle,
        text: chunkText,
        embedding,
        version,
        status,
      })
      .returning();

    if (row) {
      insertedRows.push(row);
    }
  }

  return insertedRows;
}

/**
 * Re-ingests a course from the database.
 */
export async function ingestCourse(
  courseId: string,
  options: IngestOptions = {}
): Promise<KnowledgeChunk[]> {
  const db = options.db ?? getDb();

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) return [];

  const courseModules = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, course.id));

  const moduleTitles = courseModules.map((m: any) => m.title).join(", ");
  const priceDisplay =
    course.priceMinor === 0 ? "Free" : `${course.priceMinor / 100} ${course.currency}`;

  const text = `${course.title}
Code/Slug: ${course.slug}
Price: ${priceDisplay}
Language: ${course.language}
Status: ${course.status}

Description:
${course.description}

Included Modules:
${moduleTitles || "Self-paced accessibility learning modules."}`;

  return ingest(
    {
      sourceType: "course",
      sourceId: course.id,
      title: course.title,
      text,
      language: course.language,
      status: course.status === "published" ? "published" : "draft",
    },
    options
  );
}

/**
 * Re-ingests a lesson transcript from the database.
 */
export async function ingestLesson(
  lessonId: string,
  options: IngestOptions = {}
): Promise<KnowledgeChunk[]> {
  const db = options.db ?? getDb();

  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) return [];

  const text = `${lesson.title}
Lesson Duration: ${lesson.durationSeconds ? Math.round(lesson.durationSeconds / 60) + " minutes" : "Audio lesson"}

Transcript:
${lesson.transcript}`;

  return ingest(
    {
      sourceType: "lesson",
      sourceId: lesson.id,
      title: lesson.title,
      text,
      language: "en",
      status: lesson.status === "published" ? "published" : "draft",
    },
    options
  );
}

/**
 * Re-ingests a job post from the database.
 */
export async function ingestJob(
  jobId: string,
  options: IngestOptions = {}
): Promise<KnowledgeChunk[]> {
  const db = options.db ?? getDb();

  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) return [];

  const text = `${job.title} at ${job.employer}
Location: ${job.location || "Remote"}
Job Type: ${job.jobType}
Status: ${job.status}

Description:
${job.description}

Requirements:
${job.requirements}

How to Apply:
${job.howToApply}

Accessibility & Accommodations:
${job.accessibilityNotes || "Accessible workplace. Assistive technology provided upon request."}`;

  return ingest(
    {
      sourceType: "job",
      sourceId: job.id,
      title: `${job.title} (${job.employer})`,
      text,
      language: "en",
      status: job.status === "published" ? "published" : "draft",
    },
    options
  );
}

/**
 * Automatically re-ingests an entity when it is published or edited.
 */
export async function reingestOnEntityChange(
  entityType: "course" | "lesson" | "job",
  entityId: string,
  options: IngestOptions = {}
): Promise<KnowledgeChunk[]> {
  switch (entityType) {
    case "course":
      return ingestCourse(entityId, options);
    case "lesson":
      return ingestLesson(entityId, options);
    case "job":
      return ingestJob(entityId, options);
  }
}

/**
 * Ingests all predefined static knowledge sources (help pages, guides, FAQs).
 */
export async function ingestStaticSources(
  options: IngestOptions = {}
): Promise<KnowledgeChunk[]> {
  const all: KnowledgeChunk[] = [];
  for (const src of STATIC_KNOWLEDGE_SOURCES) {
    const chunks = await ingest(src, options);
    all.push(...chunks);
  }
  return all;
}

