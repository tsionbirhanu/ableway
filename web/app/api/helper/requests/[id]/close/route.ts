import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { recordAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/auth/errors";
import { parseId, readJson } from "@/lib/auth/params";
import { canUpdateHelpRequest } from "@/lib/auth/policies";
import { authorize, requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { conversations, helpRequests, messages } from "@/lib/db/schema";

type RouteProps = { params: Promise<{ id: string }> };

const closeSchema = z.strictObject({
  notes: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/helper/requests/[id]/close
 * Marks the request done and hands the conversation back to the assistant.
 * The helper's notes are returned to them but not written to the audit log
 * (they may contain personal details).
 */
export const POST = withApi({}, async (request: Request, props: RouteProps) => {
  const actor = await requireRole(["helper", "admin"]);
  authorize(canUpdateHelpRequest(actor));
  const id = parseId((await props.params).id);
  const body = closeSchema.parse(await readJson(request));

  const updated = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .update(helpRequests)
      .set({ status: "done" })
      .where(eq(helpRequests.id, id))
      .returning();
    if (!row) throw new NotFoundError("Help request not found.");

    if (row.profileId) {
      const [conv] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.profileId, row.profileId))
        .orderBy(desc(conversations.createdAt))
        .limit(1);
      if (conv) {
        await tx
          .update(conversations)
          .set({ handledBy: "assistant" })
          .where(eq(conversations.id, conv.id));
        await tx.insert(messages).values({
          conversationId: conv.id,
          role: "helper",
          content:
            "Your support request has been completed. If you need any more help, you can speak with your Ableway Assistant anytime!",
          handledBy: "assistant",
          flags: ["request_closed"],
        });
      }
    }

    await recordAudit(tx, {
      actorId: actor.id,
      action: "help_request.closed",
      target: `help_requests:${id}`,
      metadata: { hasNotes: Boolean(body.notes) },
    });
    return row;
  });

  return Response.json({
    ok: true,
    status: "done",
    helpRequest: updated,
    notes: body.notes ?? null,
    message: "Help request successfully closed.",
  });
});
