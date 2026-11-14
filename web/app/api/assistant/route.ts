import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { appPath, languageTag } from "@/lib/api/schemas";
import { BadRequestError } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { getActor } from "@/lib/auth/session";
import { askAssistant } from "@/lib/assistant";

const actionName = z
  .string()
  .trim()
  .max(64)
  .regex(/^[A-Za-z0-9_.:-]+$/);

/**
 * Web assistant. The learner's text is untrusted: it is length-limited here,
 * redacted before storage, and the model may only return actions from the
 * page's allow-list (see lib/assistant and SECURITY.md, "Prompt injection").
 */
const assistantRequestSchema = z.strictObject({
  message: z.string().max(2000).optional(),
  text: z.string().max(2000).optional(),
  // The browser is always the web channel; Telegram arrives through its webhook.
  channel: z.literal("web").default("web"),
  conversationId: z.uuid().nullable().optional(),
  currentPage: appPath.optional(),
  pageContext: z
    .strictObject({
      page: appPath.optional(),
      allowedActions: z.array(actionName).max(50).optional(),
    })
    .optional(),
  language: languageTag.default("en"),
  registeredActions: z.array(actionName).max(50).optional(),
});

export const POST = withApi({ rateLimit: "assistant" }, async (request: Request) => {
  const input = assistantRequestSchema.parse(await readJson(request));
  const userText = (input.text || input.message || "").trim();
  if (!userText) throw new BadRequestError("Please type or say a message.");

  const actor = await getActor();
  const page = input.pageContext?.page || input.currentPage || "/";
  const allowedActions = input.pageContext?.allowedActions || input.registeredActions || [];

  const result = await askAssistant({
    channel: input.channel,
    userId: actor?.id ?? null,
    conversationId: input.conversationId ?? null,
    language: input.language,
    text: userText,
    pageContext: { page, allowedActions },
  });

  const payload = {
    reply: result.reply,
    spokenReply: result.reply,
    actions: result.actions,
    escalate: Boolean(result.escalate),
    escalateReason: result.escalate?.reason,
    escalateDetails: result.escalate,
    sources: result.sources,
    conversationId: result.conversationId,
    language: input.language,
  };

  const accept = request.headers.get("accept") || "";
  const isStreaming =
    accept.includes("text/event-stream") || request.headers.get("x-stream") === "true";
  if (!isStreaming) return Response.json(payload);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Stream the reply in word chunks, then one final packet with the rest.
      const words = result.reply.split(" ");
      words.forEach((word, i) => {
        const chunk = i === words.length - 1 ? word : `${word} `;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk, done: false })}\n\n`));
      });
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, ...payload })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
});
