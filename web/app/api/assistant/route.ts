import { z } from "zod";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { getActor } from "@/lib/auth/session";
import { askAssistant } from "@/lib/assistant";

const assistantRequestSchema = z.object({
  message: z.string().max(2000).optional(),
  text: z.string().max(2000).optional(),
  channel: z.enum(["web", "telegram"]).default("web"),
  conversationId: z.string().uuid().optional().nullable(),
  currentPage: z.string().max(300).optional(),
  pageContext: z
    .object({
      page: z.string().optional(),
      allowedActions: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
  language: z.string().min(2).max(10).default("en"),
  registeredActions: z.array(z.string()).optional(),
});

export const POST = withErrors(async (request: Request) => {
  const actor = await getActor();
  const rawBody = await readJson(request);
  const input = assistantRequestSchema.parse(rawBody);

  const userText = input.text || input.message || "";
  if (!userText.trim()) {
    return Response.json({ error: "Message text is required" }, { status: 400 });
  }

  const page = input.pageContext?.page || input.currentPage || "/";
  const allowedActions = input.pageContext?.allowedActions || input.registeredActions || [];

  const result = await askAssistant({
    channel: input.channel,
    userId: actor?.id ?? null,
    conversationId: input.conversationId ?? null,
    language: input.language,
    text: userText,
    pageContext: {
      page,
      allowedActions,
      ...input.pageContext,
    },
  });

  const acceptHeader = request.headers.get("accept") || "";
  const isStreaming = acceptHeader.includes("text/event-stream") || request.headers.get("x-stream") === "true";

  if (isStreaming) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Stream the reply in natural word chunks
        const words = result.reply.split(" ");
        for (let i = 0; i < words.length; i++) {
          const chunk = i === words.length - 1 ? words[i] : `${words[i]} `;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ chunk, done: false })}\n\n`)
          );
        }

        // Send the final packet with actions and escalation metadata at the end
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              reply: result.reply,
              spokenReply: result.reply,
              actions: result.actions,
              escalate: !!result.escalate,
              escalateDetails: result.escalate,
              escalateReason: result.escalate?.reason,
              sources: result.sources,
              conversationId: result.conversationId,
            })}\n\n`
          )
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  return Response.json({
    reply: result.reply,
    spokenReply: result.reply,
    actions: result.actions,
    escalate: !!result.escalate,
    escalateReason: result.escalate?.reason,
    escalateDetails: result.escalate,
    sources: result.sources,
    conversationId: result.conversationId,
    language: input.language,
  });
});
