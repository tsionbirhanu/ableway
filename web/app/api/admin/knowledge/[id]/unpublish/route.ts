import { eq } from "drizzle-orm";
import { canManageKnowledge } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { getDb } from "@/lib/db/client";
import { knowledgeChunks } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withErrors(async (_request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canManageKnowledge(actor));

  const { id } = await context.params;
  const db = getDb();

  const [existing] = await db
    .select()
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.id, id))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Knowledge chunk not found");
  }

  const [updated] = await db
    .update(knowledgeChunks)
    .set({
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(knowledgeChunks.id, id))
    .returning({
      id: knowledgeChunks.id,
      title: knowledgeChunks.title,
      status: knowledgeChunks.status,
      version: knowledgeChunks.version,
      updatedAt: knowledgeChunks.updatedAt,
    });

  return Response.json({ success: true, chunk: updated });
});

