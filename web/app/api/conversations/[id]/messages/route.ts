import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { withApi } from "@/lib/api/handler";
import { NotFoundError } from "@/lib/auth/errors";
import { parseId } from "@/lib/auth/params";
import { canViewMessages } from "@/lib/auth/policies";
import { authorize, requireActor } from "@/lib/auth/session";

/** Messages in one conversation, oldest first. Owner or admin only (not helpers). */
export const GET = withApi(
  {},
  async (_request: Request, ctx: RouteContext<"/api/conversations/[id]/messages">) => {
    const actor = await requireActor();
    const id = parseId((await ctx.params).id);
    const db = getDb();

    const [conversation] = await db
      .select({ id: conversations.id, profileId: conversations.profileId })
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conversation) throw new NotFoundError();

    authorize(canViewMessages(actor, conversation));

    const rows = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        flags: messages.flags,
        handledBy: messages.handledBy,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    return Response.json({ messages: rows });
  },
);
