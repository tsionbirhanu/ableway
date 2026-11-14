import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { knowledgeChunks, unansweredQuestions } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { getEmbedder } from "./embedder";
import type { Embedder, SearchResult } from "./types";

export interface RetrieveOptions {
  embedder?: Embedder;
  db?: Db;
  /** Minimum similarity threshold (0 to 1). Defaults to 0.20. */
  minSimilarity?: number;
  /** Automatically record as unanswered question if nothing meets minSimilarity. */
  recordIfUnanswered?: boolean;
  channel?: "web" | "telegram";
}

export const DEFAULT_MIN_SIMILARITY = 0.2;

/**
 * Retrieves the top-k most relevant knowledge chunks for a question.
 * 1. Embeds the question.
 * 2. Runs a pgvector cosine search (<=> operator).
 * 3. Filters by published status and language.
 * 4. Returns empty list below minimum similarity so assistant can say it is not sure.
 */
export async function retrieve(
  question: string,
  language: string = "en",
  k: number = 5,
  options: RetrieveOptions = {},
): Promise<SearchResult[]> {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return [];

  const db = options.db ?? getDb();
  const embedder = options.embedder ?? getEmbedder();
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;

  // 1. Embed question vector
  const queryEmbedding = await embedder.embed(cleanQuestion);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // Language match condition (handles both 'en'/'en-US' and 'am'/'am-ET')
  const isAmharic = language.startsWith("am");
  const langCondition = isAmharic
    ? sql`(${knowledgeChunks.language} = 'am' OR ${knowledgeChunks.language} = 'am-ET')`
    : sql`(${knowledgeChunks.language} = ${language} OR ${knowledgeChunks.language} = ${language.split("-")[0]})`;

  // 2. Query pgvector using cosine distance operator <=>
  const rows = await db
    .select({
      id: knowledgeChunks.id,
      sourceType: knowledgeChunks.sourceType,
      sourceId: knowledgeChunks.sourceId,
      title: knowledgeChunks.title,
      text: knowledgeChunks.text,
      language: knowledgeChunks.language,
      version: knowledgeChunks.version,
      status: knowledgeChunks.status,
      similarity: sql<number>`1 - (${knowledgeChunks.embedding} <=> ${vectorStr}::vector)`,
    })
    .from(knowledgeChunks)
    .where(
      and(
        eq(knowledgeChunks.status, "published"),
        langCondition,
        isNotNull(knowledgeChunks.embedding),
      ),
    )
    .orderBy(sql`${knowledgeChunks.embedding} <=> ${vectorStr}::vector`)
    .limit(k);

  // 3. Minimum similarity check
  // Return empty list below minimum similarity so the assistant can say it is not sure.
  if (rows.length === 0 || rows[0].similarity < minSimilarity) {
    if (options.recordIfUnanswered) {
      await recordUnanswered(cleanQuestion, {
        language,
        channel: options.channel ?? "web",
        db,
      });
    }
    return [];
  }

  // Filter only results that meet the minimum threshold
  return rows.filter((r) => r.similarity >= minSimilarity);
}

/**
 * Records an unanswered question into unanswered_questions table for staff review.
 */
export async function recordUnanswered(
  question: string,
  options?: { language?: string; channel?: "web" | "telegram"; db?: Db },
): Promise<void> {
  const clean = question.trim();
  if (!clean) return;

  const db = options?.db ?? getDb();
  await db.insert(unansweredQuestions).values({
    text: clean,
    language: options?.language ?? "en",
    channel: options?.channel ?? "web",
    resolved: false,
  });
}
