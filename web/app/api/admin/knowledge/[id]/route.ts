import { eq } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { languageTag } from "@/lib/api/schemas";
import { recordAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/auth/errors";
import { parseId, readJson } from "@/lib/auth/params";
import { canManageKnowledge } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { contentStatus, knowledgeChunks } from "@/lib/db/schema";
import { getEmbedder } from "@/lib/knowledge/embedder";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_TEXT = 50_000;

const updateSchema = z.strictObject({
  title: z.string().trim().min(1).max(300).optional(),
  text: z.string().trim().min(1).max(MAX_TEXT).optional(),
  language: languageTag.optional(),
  status: z.enum(contentStatus.enumValues).optional(),
  version: z.number().int().positive().max(1_000_000).optional(),
});

const chunkColumns = {
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
};

export const GET = withApi({}, async (_request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));
  const id = parseId((await context.params).id);

  const [chunk] = await getDb()
    .select(chunkColumns)
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.id, id))
    .limit(1);
  if (!chunk) throw new NotFoundError("Knowledge chunk not found");
  return Response.json({ chunk });
});

export const PATCH = withApi(
  { maxBodyBytes: 256 * 1024 },
  async (request: Request, context: RouteContext) => {
    const actor = await requireActor();
    authorize(canManageKnowledge(actor));
    const id = parseId((await context.params).id);
    const body = updateSchema.parse(await readJson(request));
    const db = getDb();

    const [existing] = await db
      .select()
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.id, id))
      .limit(1);
    if (!existing) throw new NotFoundError("Knowledge chunk not found");

    const updates: Partial<typeof knowledgeChunks.$inferInsert> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.language !== undefined) updates.language = body.language;
    if (body.status !== undefined) updates.status = body.status;

    // If the text changed, re-embed now and bump the version.
    const textChanged = body.text !== undefined && body.text !== existing.text;
    if (textChanged) {
      updates.text = body.text;
      updates.embedding = await getEmbedder().embed(body.text!);
      updates.version = body.version ?? existing.version + 1;
    } else if (body.version !== undefined) {
      updates.version = body.version;
    }

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(knowledgeChunks)
        .set(updates)
        .where(eq(knowledgeChunks.id, id))
        .returning(chunkColumns);
      await recordAudit(tx, {
        actorId: actor.id,
        action: "knowledge.updated",
        target: `knowledge_chunks:${id}`,
        metadata: {
          fields: Object.keys(updates),
          textChanged,
          fromVersion: existing.version,
          toVersion: row?.version ?? existing.version,
          status: row?.status ?? existing.status,
        },
      });
      return row;
    });

    return Response.json({ chunk: updated });
  },
);

export const DELETE = withApi({}, async (_request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));
  const id = parseId((await context.params).id);

  const deleted = await getDb().transaction(async (tx) => {
    const [row] = await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.id, id)).returning({
      id: knowledgeChunks.id,
      sourceType: knowledgeChunks.sourceType,
      version: knowledgeChunks.version,
    });
    if (!row) throw new NotFoundError("Knowledge chunk not found");
    await recordAudit(tx, {
      actorId: actor.id,
      action: "knowledge.deleted",
      target: `knowledge_chunks:${id}`,
      metadata: { sourceType: row.sourceType, version: row.version },
    });
    return row;
  });

  return Response.json({ success: true, id: deleted.id });
});
