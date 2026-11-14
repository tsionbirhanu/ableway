import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { languageTag, queryInt } from "@/lib/api/schemas";
import { recordAudit } from "@/lib/audit";
import { parseQuery, readJson } from "@/lib/auth/params";
import { canManageKnowledge } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { contentStatus, knowledgeChunks, knowledgeSourceType } from "@/lib/db/schema";
import { ingest } from "@/lib/knowledge/ingest";

const createSchema = z.strictObject({
  title: z.string().trim().min(1).max(300),
  text: z.string().trim().min(1).max(50_000),
  sourceType: z.enum(knowledgeSourceType.enumValues),
  sourceId: z.uuid().nullable().optional(),
  language: languageTag.default("en"),
  status: z.enum(contentStatus.enumValues).default("published"),
  version: z.number().int().positive().max(1_000_000).optional(),
});

const listQuery = z.strictObject({
  sourceType: z.enum(knowledgeSourceType.enumValues).optional(),
  language: languageTag.optional(),
  status: z.enum(contentStatus.enumValues).optional(),
  search: z.string().trim().max(200).optional(),
  limit: queryInt(1, 100, 50),
  offset: queryInt(0, 100_000, 0),
});

/** Escape LIKE wildcards so a search for "100%" means the text "100%". */
const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export const GET = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));
  const q = parseQuery(request, listQuery);

  const conditions = [];
  if (q.sourceType) conditions.push(eq(knowledgeChunks.sourceType, q.sourceType));
  if (q.language) conditions.push(eq(knowledgeChunks.language, q.language));
  if (q.status) conditions.push(eq(knowledgeChunks.status, q.status));
  if (q.search) {
    const term = `%${likeEscape(q.search)}%`;
    conditions.push(or(ilike(knowledgeChunks.title, term), ilike(knowledgeChunks.text, term)));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const db = getDb();
  const [totalRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(knowledgeChunks)
    .where(whereClause);

  const chunks = await db
    .select({
      id: knowledgeChunks.id,
      sourceType: knowledgeChunks.sourceType,
      sourceId: knowledgeChunks.sourceId,
      language: knowledgeChunks.language,
      title: knowledgeChunks.title,
      text: knowledgeChunks.text,
      version: knowledgeChunks.version,
      status: knowledgeChunks.status,
      createdAt: knowledgeChunks.createdAt,
      updatedAt: knowledgeChunks.updatedAt,
    })
    .from(knowledgeChunks)
    .where(whereClause)
    .orderBy(desc(knowledgeChunks.updatedAt))
    .limit(q.limit)
    .offset(q.offset);

  return Response.json({
    chunks,
    total: Number(totalRes?.count ?? 0),
    limit: q.limit,
    offset: q.offset,
  });
});

export const POST = withApi({ maxBodyBytes: 256 * 1024 }, async (request: Request) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));
  const body = createSchema.parse(await readJson(request));
  const db = getDb();

  const chunks = await ingest(body, { db });
  await recordAudit(db, {
    actorId: actor.id,
    action: "knowledge.created",
    target: `knowledge_chunks:${chunks[0]?.id ?? "none"}`,
    metadata: {
      sourceType: body.sourceType,
      sourceId: body.sourceId ?? null,
      chunkIds: chunks.map((c) => c.id),
      status: body.status,
      version: chunks[0]?.version ?? null,
    },
  });

  return Response.json({ chunks }, { status: 201 });
});
