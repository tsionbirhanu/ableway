import { eq } from "drizzle-orm";
import { z } from "zod";
import { canManageKnowledge } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { getDb } from "@/lib/db/client";
import { knowledgeChunks, contentStatus } from "@/lib/db/schema";
import { getEmbedder } from "@/lib/knowledge/embedder";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  text: z.string().min(1).optional(),
  language: z.string().min(2).max(10).optional(),
  status: z.enum(contentStatus.enumValues).optional(),
  version: z.number().int().positive().optional(),
});

export const GET = withErrors(async (_request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));

  const { id } = await context.params;
  const db = getDb();

  const [chunk] = await db
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
    .where(eq(knowledgeChunks.id, id))
    .limit(1);

  if (!chunk) {
    throw new NotFoundError("Knowledge chunk not found");
  }

  return Response.json({ chunk });
});

export const PATCH = withErrors(async (request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));

  const { id } = await context.params;
  const body = updateSchema.parse(await readJson(request));
  const db = getDb();

  const [existing] = await db
    .select()
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.id, id))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Knowledge chunk not found");
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) updates.title = body.title;
  if (body.language !== undefined) updates.language = body.language;
  if (body.status !== undefined) updates.status = body.status;

  // If text changed, re-embed immediately and bump version
  if (body.text !== undefined && body.text !== existing.text) {
    updates.text = body.text;
    const embedder = getEmbedder();
    updates.embedding = await embedder.embed(body.text);
    updates.version = body.version !== undefined ? body.version : existing.version + 1;
  } else if (body.version !== undefined) {
    updates.version = body.version;
  }

  const [updated] = await db
    .update(knowledgeChunks)
    .set(updates)
    .where(eq(knowledgeChunks.id, id))
    .returning({
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
    });

  return Response.json({ chunk: updated });
});

export const DELETE = withErrors(async (_request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));

  const { id } = await context.params;
  const db = getDb();

  const [deleted] = await db
    .delete(knowledgeChunks)
    .where(eq(knowledgeChunks.id, id))
    .returning({ id: knowledgeChunks.id });

  if (!deleted) {
    throw new NotFoundError("Knowledge chunk not found");
  }

  return Response.json({ success: true, id: deleted.id });
});

