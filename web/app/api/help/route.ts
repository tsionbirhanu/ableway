import { z } from "zod";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { helpChannel, helpRequests, helpRequestType } from "@/lib/db/schema";
import { summarizeConversation } from "@/lib/assistant";

const helpSchema = z.object({
  type: z.enum(helpRequestType.enumValues).default("general"),
  trigger: z.enum(["learner", "assistant"]).default("learner"),
  reason: z.string().trim().min(1).max(500),
  summary: z.string().trim().max(2000).optional(),
  page: z.string().trim().max(300).optional(),
  language: z.string().default("en"),
  channel: z.enum(helpChannel.enumValues).default("web"),
  conversationId: z.string().uuid().optional(),
});

export const POST = withErrors(async (request: Request) => {
  const actor = await getActor();
  const body = helpSchema.parse(await readJson(request));
  const db = getDb();

  let summary = body.summary;
  if (!summary && body.conversationId) {
    summary = await summarizeConversation(body.conversationId, { db });
  }

  const [created] = await db
    .insert(helpRequests)
    .values({
      profileId: actor?.id ?? null,
      type: body.type,
      trigger: body.trigger,
      reason: body.reason,
      summary: summary ?? null,
      page: body.page ?? null,
      channel: body.channel,
      status: "waiting",
    })
    .returning();

  return Response.json(
    {
      id: created.id,
      type: created.type,
      status: created.status,
      trigger: created.trigger,
      channel: created.channel,
      reason: created.reason,
      summary: created.summary,
      message: "A human helper has been notified and will assist you shortly.",
    },
    { status: 201 }
  );
});
