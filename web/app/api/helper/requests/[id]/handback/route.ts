import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { conversations, helpRequests, messages } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { requireRole } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/helper/requests/[id]/handback
 * Returns the conversation back to the assistant so the assistant can answer again.
 */
export const POST = withErrors(async (_request: Request, props: RouteProps) => {
  await requireRole(["helper", "admin"]);
  const { id } = await props.params;
  const db = getDb();

  const [helpReq] = await db
    .select()
    .from(helpRequests)
    .where(eq(helpRequests.id, id))
    .limit(1);

  if (!helpReq) {
    throw new NotFoundError("Help request not found.");
  }

  if (helpReq.profileId) {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.profileId, helpReq.profileId))
      .limit(1);

    if (conv) {
      await db
        .update(conversations)
        .set({ handledBy: "assistant" })
        .where(eq(conversations.id, conv.id));

      await db.insert(messages).values({
        conversationId: conv.id,
        role: "assistant",
        content: "I am back to assist you with your learning, courses, or jobs.",
        handledBy: "assistant",
        flags: ["handback" as any],
      });
    }
  }

  return Response.json({
    ok: true,
    handledBy: "assistant",
    message: "Conversation successfully returned to assistant.",
  });
});

