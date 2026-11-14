import { eq } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { recordAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/auth/errors";
import { parseId, readJson } from "@/lib/auth/params";
import { canViewUnansweredQuestions } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { unansweredQuestions } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.strictObject({ resolved: z.boolean() });

export const PATCH = withApi({}, async (request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canViewUnansweredQuestions(actor));
  const id = parseId((await context.params).id);
  const body = updateSchema.parse(await readJson(request));

  const [updated] = await getDb()
    .update(unansweredQuestions)
    .set({ resolved: body.resolved })
    .where(eq(unansweredQuestions.id, id))
    .returning();
  if (!updated) throw new NotFoundError("Unanswered question not found");
  return Response.json({ question: updated });
});

export const DELETE = withApi({}, async (_request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canViewUnansweredQuestions(actor));
  const id = parseId((await context.params).id);

  const deleted = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .delete(unansweredQuestions)
      .where(eq(unansweredQuestions.id, id))
      .returning({ id: unansweredQuestions.id });
    if (!row) throw new NotFoundError("Unanswered question not found");
    await recordAudit(tx, {
      actorId: actor.id,
      action: "unanswered.deleted",
      target: `unanswered_questions:${id}`,
    });
    return row;
  });

  return Response.json({ success: true, id: deleted.id });
});
