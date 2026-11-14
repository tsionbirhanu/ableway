import { eq } from "drizzle-orm";
import { withApi } from "@/lib/api/handler";
import { recordAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/auth/errors";
import { parseId } from "@/lib/auth/params";
import { canManageKnowledge } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { knowledgeChunks } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

/** Take a knowledge chunk out of the assistant's answers at once (status = draft). */
export const POST = withApi({}, async (_request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));
  const id = parseId((await context.params).id);

  const updated = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .update(knowledgeChunks)
      .set({ status: "draft" })
      .where(eq(knowledgeChunks.id, id))
      .returning({
        id: knowledgeChunks.id,
        title: knowledgeChunks.title,
        status: knowledgeChunks.status,
        version: knowledgeChunks.version,
        updatedAt: knowledgeChunks.updatedAt,
      });
    if (!row) throw new NotFoundError("Knowledge chunk not found");
    await recordAudit(tx, {
      actorId: actor.id,
      action: "knowledge.unpublished",
      target: `knowledge_chunks:${id}`,
      metadata: { version: row.version },
    });
    return row;
  });

  return Response.json({ success: true, chunk: updated });
});
