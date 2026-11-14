import { eq } from "drizzle-orm";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { appPath, languageTag } from "@/lib/api/schemas";
import { readJson } from "@/lib/auth/params";
import { getActor } from "@/lib/auth/session";
import { summarizeConversation } from "@/lib/assistant";
import { getDb } from "@/lib/db/client";
import { conversations, helpChannel, helpRequestType } from "@/lib/db/schema";
import { createLearnerHelpRequest } from "@/lib/help-requests";
import { isHelperAvailable, getAvailableCallbackSlots } from "@/lib/helper/settings";

/**
 * Ask for a human from the web assistant. Same policy and per-IP limit as
 * POST /api/help-requests. A conversation summary is attached only if the
 * conversation belongs to the person asking.
 */
const helpSchema = z.strictObject({
  type: z.enum(helpRequestType.enumValues).default("general"),
  trigger: z.enum(["learner", "assistant"]).default("learner"),
  reason: z.string().trim().min(1).max(500),
  summary: z.string().trim().max(2000).optional(),
  page: appPath.optional(),
  language: languageTag.default("en"),
  channel: z.enum(helpChannel.enumValues).default("web"),
  conversationId: z.uuid().optional(),
});

export const POST = withApi({}, async (request: Request) => {
  const body = helpSchema.parse(await readJson(request));
  const actor = await getActor();
  const db = getDb();

  let summary = body.summary ?? null;
  if (!summary && body.conversationId) {
    const [conversation] = await db
      .select({ profileId: conversations.profileId })
      .from(conversations)
      .where(eq(conversations.id, body.conversationId));
    if (conversation && actor && conversation.profileId === actor.id) {
      summary = await summarizeConversation(body.conversationId, { db });
    }
  }

  const created = await createLearnerHelpRequest(request, {
    type: body.type,
    reason: body.reason,
    channel: body.channel,
    page: body.page,
    trigger: body.trigger,
    summary,
  });

  const isAvailable = isHelperAvailable();
  const callbackSlots = !isAvailable ? getAvailableCallbackSlots() : [];

  return Response.json(
    {
      id: created.id,
      type: body.type,
      status: created.status,
      trigger: body.trigger,
      channel: body.channel,
      isOperatingHours: isAvailable,
      availableCallbackSlots: callbackSlots,
      message: isAvailable
        ? "A human helper has been notified and will assist you shortly."
        : "Our helpers are currently offline. You can choose a callback time or wait in queue.",
    },
    { status: 201 },
  );
});
