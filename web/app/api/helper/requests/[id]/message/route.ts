import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { conversations, helpRequests, messages } from "@/lib/db/schema";
import { NotFoundError, BadRequestError } from "@/lib/auth/errors";
import { withApi } from "@/lib/api/handler";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";
import { relayHelperMessage } from "@/lib/telegram/relay";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const messageSchema = z.strictObject({
  message: z.string().trim().min(1, "Message cannot be empty").max(2000),
});

/**
 * POST /api/helper/requests/[id]/message
 * Dispatches a human helper message into the learner's active conversation (web or Telegram).
 */
export const POST = withApi({}, async (request: Request, props: RouteProps) => {
  await requireRole(["helper", "admin"]);
  const { id } = await props.params;
  const { message } = messageSchema.parse(await readJson(request));
  const db = getDb();

  const [helpReq] = await db.select().from(helpRequests).where(eq(helpRequests.id, id)).limit(1);

  if (!helpReq) {
    throw new NotFoundError("Help request not found.");
  }

  if (!helpReq.profileId) {
    throw new BadRequestError("Help request is not associated with a registered learner.");
  }

  // Find the conversation
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.profileId, helpReq.profileId))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  let insertedMessage = null;
  if (conv) {
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: conv.id,
        role: "helper",
        content: message,
        handledBy: "helper",
        flags: [],
      })
      .returning();
    insertedMessage = msg;
  }

  // If this was a Telegram request, relay to Telegram bot as well
  if (helpReq.channel === "telegram") {
    await relayHelperMessage(helpReq.profileId, message).catch(() => {
      // Ignore telegram delivery error if not connected
    });
  }

  return Response.json({
    ok: true,
    message: insertedMessage,
    channel: helpReq.channel,
  });
});
