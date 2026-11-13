import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { conversations, helpRequests, messages } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { requireRole } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/helper/requests/[id]/accept
 * Assigns the request to the helper, sets status to in_progress,
 * and sets conversations.handled_by = 'helper' so the assistant stays silent.
 */
export const POST = withErrors(async (_request: Request, props: RouteProps) => {
  const actor = await requireRole(["helper", "admin"]);
  const { id } = await props.params;
  const db = getDb();

  const [request] = await db
    .select()
    .from(helpRequests)
    .where(eq(helpRequests.id, id))
    .limit(1);

  if (!request) {
    throw new NotFoundError("Help request not found.");
  }

  // Update request to in_progress assigned to current helper
  const [updated] = await db
    .update(helpRequests)
    .set({
      assignedHelperId: actor.id,
      status: "in_progress",
    })
    .where(eq(helpRequests.id, id))
    .returning();

  // If learner has an active conversation, switch handled_by to helper
  if (request.profileId) {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.profileId, request.profileId))
      .limit(1);

    if (conv) {
      await db
        .update(conversations)
        .set({ handledBy: "helper" })
        .where(eq(conversations.id, conv.id));

      // Post introductory helper message
      await db.insert(messages).values({
        conversationId: conv.id,
        role: "helper",
        content: "Hello! I am a staff helper. I have joined this chat to assist you directly.",
        handledBy: "helper",
        flags: ["handover_accepted" as any],
      });
    }
  }

  return Response.json({
    ok: true,
    status: "in_progress",
    assignedHelperId: actor.id,
    helpRequest: updated,
    message: "Help request accepted. Handover to helper active.",
  });
});

