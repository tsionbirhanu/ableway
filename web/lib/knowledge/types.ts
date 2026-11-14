import type { knowledgeChunks, knowledgeSourceType, contentStatus } from "@/lib/db/schema";

export type KnowledgeSourceType = (typeof knowledgeSourceType.enumValues)[number];
export type ContentStatus = (typeof contentStatus.enumValues)[number];

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;

export interface IngestSource {
  sourceType: KnowledgeSourceType;
  sourceId?: string | null;
  title: string;
  text: string;
  language?: string;
  version?: number;
  status?: ContentStatus;
}

export interface SearchResult {
  id: string;
  sourceType: KnowledgeSourceType;
  sourceId: string | null;
  title: string;
  text: string;
  language: string;
  version: number;
  status: ContentStatus;
  similarity: number;
}

export interface Embedder {
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
