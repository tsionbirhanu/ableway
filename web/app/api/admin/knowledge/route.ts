import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { canManageKnowledge } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { getDb } from "@/lib/db/client";
import { knowledgeChunks, knowledgeSourceType, contentStatus } from "@/lib/db/schema";
import { ingest } from "@/lib/knowledge/ingest";

const createSchema = z.object({
  title: z.string().min(1).max(300),
  text: z.string().min(1),
  sourceType: z.enum(knowledgeSourceType.enumValues),
  sourceId: z.string().uuid().nullable().optional(),
  language: z.string().min(2).max(10).optional().default("en"),
  status: z.enum(contentStatus.enumValues).optional().default("published"),
  version: z.number().int().positive().optional(),
});

export const GET = withErrors(async (request: Request) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));

  const url = new URL(request.url);
  const sourceType = url.searchParams.get("sourceType");
  const language = url.searchParams.get("language");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

  const db = getDb();
  const conditions = [];

  if (sourceType && (knowledgeSourceType.enumValues as readonly string[]).includes(sourceType)) {
    conditions.push(eq(knowledgeChunks.sourceType, sourceType as any));
  }
  if (language) {
    conditions.push(eq(knowledgeChunks.language, language));
  }
  if (status && (contentStatus.enumValues as readonly string[]).includes(status)) {
    conditions.push(eq(knowledgeChunks.status, status as any));
  }
  if (search) {
    const term = `%${search}%`;
    conditions.push(or(ilike(knowledgeChunks.title, term), ilike(knowledgeChunks.text, term)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
    .limit(limit)
    .offset(offset);

  return Response.json({
    chunks,
    total: Number(totalRes?.count ?? 0),
    limit,
    offset,
  });
});

export const POST = withErrors(async (request: Request) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));

  const body = createSchema.parse(await readJson(request));

  const chunks = await ingest({
    sourceType: body.sourceType,
    sourceId: body.sourceId,
    title: body.title,
    text: body.text,
    language: body.language,
    status: body.status,
    version: body.version,
  });

  return Response.json({ chunks }, { status: 201 });
});

