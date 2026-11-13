import { z } from "zod";
import { withErrors } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { replyTo } from "@/lib/assistant/keyword-replies";

export interface AssistantAction {
  name: string;
  params: Record<string, unknown>;
}

export interface AssistantApiResponse {
  reply: string;
  spokenReply?: string;
  actions: AssistantAction[];
  escalate: boolean;
  escalateReason?: string;
  language: string;
}

const bodySchema = z.object({
  message: z.string().max(2000),
  currentPage: z.string().max(300).optional(),
  language: z.string().min(2).max(10).default("en"),
  registeredActions: z.array(z.string()).optional().default([]),
});

export const POST = withErrors(async (request: Request) => {
  const { message, currentPage, language, registeredActions } = bodySchema.parse(await readJson(request));

  const lower = message.toLowerCase().trim();

  // Check for test override or direct escalation
  const isEscalate =
    lower.includes("human") ||
    lower.includes("agent") ||
    lower.includes("call a person") ||
    lower.includes("call person") ||
    lower.includes("call staff") ||
    lower.includes("help me");

  let replyText = "";
  let spokenText = "";
  const actions: AssistantAction[] = [];
  let escalate = isEscalate;
  let escalateReason: string | undefined = undefined;

  if (isEscalate) {
    replyText = "I am connecting you with a human helper. Someone will assist you shortly.";
    spokenText = "I am connecting you with a human helper now.";
    escalate = true;
    escalateReason = "Learner requested a human helper";
  } else if (lower.includes("select course") || lower.includes("enroll")) {
    if (registeredActions.includes("selectCourse")) {
      actions.push({
        name: "selectCourse",
        params: { courseId: "course-1", title: "Digital Accessibility Fundamentals" },
      });
      replyText = "I will help you enroll in Digital Accessibility Fundamentals.";
      spokenText = "I will help you enroll in Digital Accessibility Fundamentals.";
    } else {
      actions.push({ name: "goToPage", params: { path: "/courses" } });
      replyText = "I am taking you to the courses page so you can select a course.";
      spokenText = "Navigating to courses.";
    }
  } else if (lower.includes("fill") || lower.includes("email") || lower.includes("name")) {
    if (registeredActions.includes("fillField")) {
      actions.push({
        name: "fillField",
        params: { field: "email", value: "learner@example.com" },
      });
      replyText = "Filling in your email address.";
      spokenText = "Filling in your email.";
    } else {
      replyText = "To fill in fields, please navigate to the registration or profile page.";
      spokenText = "Please navigate to the registration page to fill fields.";
    }
  } else {
    // Default reply engine
    const base = replyTo(message, language);
    replyText = base.reply;
    spokenText = base.spokenReply || base.reply;
    escalate = base.escalateToHuman;
    if (escalate) escalateReason = "Learner requested human assistance";
    if (base.actions) {
      for (const a of base.actions) {
        actions.push({ name: a.name, params: a.params as Record<string, unknown> });
      }
    }
  }

  const responseData: AssistantApiResponse = {
    reply: replyText,
    spokenReply: spokenText,
    actions,
    escalate,
    escalateReason,
    language,
  };

  // Check if client requested a stream
  const acceptHeader = request.headers.get("accept") || "";
  const shouldStream = acceptHeader.includes("text/event-stream") || request.headers.get("x-stream") === "true";

  if (shouldStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial chunk
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ chunk: replyText, done: false })}\n\n`)
        );
        // Send final metadata
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ ...responseData, done: true })}\n\n`)
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

  return Response.json(responseData);
});

