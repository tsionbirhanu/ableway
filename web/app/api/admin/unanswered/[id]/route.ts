import { eq } from "drizzle-orm";
import { z } from "zod";
import { canViewUnansweredQuestions } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { getDb } from "@/lib/db/client";
import { unansweredQuestions } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  resolved: z.boolean(),
});

export const PATCH = withErrors(async (request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canViewUnansweredQuestions(actor));

  const { id } = await context.params;
  const body = updateSchema.parse(await readJson(request));
  const db = getDb();

  const [existing] = await db
    .select()
    .from(unansweredQuestions)
    .where(eq(unansweredQuestions.id, id))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Unanswered question not found");
  }

  const [updated] = await db
    .update(unansweredQuestions)
    .set({
      resolved: body.resolved,
      updatedAt: new Date(),
    })
    .where(eq(unansweredQuestions.id, id))
    .returning();

  return Response.json({ question: updated });
});

export const DELETE = withErrors(async (_request: Request, context: RouteContext) => {
  const actor = await requireActor();
  authorize(canViewUnansweredQuestions(actor));

  const { id } = await context.params;
  const db = getDb();

  const [deleted] = await db
    .delete(unansweredQuestions)
    .where(eq(unansweredQuestions.id, id))
    .returning({ id: unansweredQuestions.id });

  if (!deleted) {
    throw new NotFoundError("Unanswered question not found");
  }

  return Response.json({ success: true, id: deleted.id });
});

