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
 * POST /api/helper/requests/[id]/handback
 * Returns the learner's conversation to the assistant.
 */
export const POST = withApi({}, async (_request: Request, props: RouteProps) => {
  const actor = await requireRole(["helper", "admin"]);
  authorize(canUpdateHelpRequest(actor));
  const id = parseId((await props.params).id);
  const db = getDb();

  const [helpReq] = await db
    .select({ profileId: helpRequests.profileId })
    .from(helpRequests)
    .where(eq(helpRequests.id, id))
    .limit(1);
  if (!helpReq) throw new NotFoundError("Help request not found.");

  if (helpReq.profileId) {
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.profileId, helpReq.profileId))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    if (conv) {
      await db.transaction(async (tx) => {
        await tx
          .update(conversations)
          .set({ handledBy: "assistant" })
          .where(eq(conversations.id, conv.id));
        await tx.insert(messages).values({
          conversationId: conv.id,
          role: "assistant",
          content: "I am back to assist you with your learning, courses, or jobs.",
          handledBy: "assistant",
          flags: ["handback"],
        });
      });
    }
  }

  return Response.json({
    ok: true,
    handledBy: "assistant",
    message: "Conversation successfully returned to assistant.",
  });
});
