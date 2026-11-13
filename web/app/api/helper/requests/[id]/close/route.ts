import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { auditLog, conversations, helpRequests, messages } from "@/lib/db/schema";
import { NotFoundError, withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { requireRole } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const closeSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/helper/requests/[id]/close
 * Closes the help request with notes, setting status to 'done'.
 */
export const POST = withErrors(async (request: Request, props: RouteProps) => {
  const actor = await requireRole(["helper", "admin"]);
  const { id } = await props.params;
  const body = closeSchema.parse(await readJson(request));
  const db = getDb();

  const [helpReq] = await db
    .select()
    .from(helpRequests)
    .where(eq(helpRequests.id, id))
    .limit(1);

  if (!helpReq) {
    throw new NotFoundError("Help request not found.");
  }

  const [updated] = await db
    .update(helpRequests)
    .set({
      status: "done",
    })
    .where(eq(helpRequests.id, id))
    .returning();

  // If learner had a conversation, post closing message and restore handled_by to assistant
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
        role: "helper",
        content: `Your support request has been completed. If you need any more help, you can speak with your Ableway Assistant anytime!`,
        handledBy: "assistant",
        flags: ["request_closed" as any],
      });
    }
  }

  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "help_request.closed",
    target: `help_requests:${id}`,
    metadata: {
      closedBy: actor.id,
      notes: body.notes ?? null,
    },
  });

  return Response.json({
    ok: true,
    status: "done",
    helpRequest: updated,
    notes: body.notes ?? null,
    message: "Help request successfully closed.",
  });
});

