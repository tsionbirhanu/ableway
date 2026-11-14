import { desc, eq } from "drizzle-orm";
import { withApi } from "@/lib/api/handler";
import { NotFoundError } from "@/lib/auth/errors";
import { parseId } from "@/lib/auth/params";
import { canUpdateHelpRequest } from "@/lib/auth/policies";
import { authorize, requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { conversations, helpRequests, messages } from "@/lib/db/schema";

type RouteProps = { params: Promise<{ id: string }> };

/**
 * POST /api/helper/requests/[id]/accept
 * Assigns the request to the helper, sets it in_progress, and sets the
 * learner's latest conversation to handled_by = helper so the assistant stays silent.
 */
export const POST = withApi({}, async (_request: Request, props: RouteProps) => {
  const actor = await requireRole(["helper", "admin"]);
  authorize(canUpdateHelpRequest(actor));
  const id = parseId((await props.params).id);

  const result = await getDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(helpRequests)
      .set({ assignedHelperId: actor.id, status: "in_progress" })
      .where(eq(helpRequests.id, id))
      .returning();
    if (!updated) throw new NotFoundError("Help request not found.");

    if (updated.profileId) {
      const [conv] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.profileId, updated.profileId))
        .orderBy(desc(conversations.createdAt))
        .limit(1);
      if (conv) {
        await tx
          .update(conversations)
          .set({ handledBy: "helper" })
          .where(eq(conversations.id, conv.id));
        await tx.insert(messages).values({
          conversationId: conv.id,
          role: "helper",
          content: "Hello! I am a staff helper. I have joined this chat to assist you directly.",
          handledBy: "helper",
          flags: ["handover_accepted"],
        });
      }
    }
    return updated;
  });

  return Response.json({
    ok: true,
    status: "in_progress",
    assignedHelperId: actor.id,
    helpRequest: result,
    message: "Help request accepted. Handover to helper active.",
  });
});
