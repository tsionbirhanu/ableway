import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { conversations, messages, unansweredQuestions } from "@/lib/db/schema";
import { retrieve } from "@/lib/knowledge/retrieve";
import type { Db } from "@/lib/db/types";
import { callGeminiAssistant } from "./gemini";
import {
  hasThreeFailedTurnsInARow,
  isDistress,
  isHumanRequest,
  recordUnansweredQuestion,
} from "./escalation";
import type {
  AskAssistantParams,
  AskAssistantResult,
  AssistantActionResult,
  EscalationResult,
  HelpRequestType,
} from "./types";

export * from "./types";
export * from "./tools";
export * from "./prompts";
export * from "./escalation";
export * from "./gemini";

/**
 * The main Assistant interaction engine.
 *
 * Implements:
 * 1. Scope bounded to platform, courses, jobs, Telegram, support.
 * 2. Grounded answering only from retrieved knowledge chunks.
 * 3. Polite refusal for off-topic/harmful queries.
 * 4. Empathetic crisis/distress handling.
 * 5. Fixed function calling (8 tools) with Zod & page validation.
 * 6. Escalation triggers & saving to unanswered_questions.
 * 7. Persistence and silence when conversation.handled_by = 'helper'.
 */
export async function askAssistant(params: AskAssistantParams): Promise<AskAssistantResult> {
  const {
    channel,
    userId = null,
    language = "en",
    text,
    pageContext,
    db: customDb,
    embedder,
    fetch: customFetch,
    apiKey,
    model,
  } = params;

  const db = customDb ?? getDb();
  const cleanText = text.trim();

  // 1. Resolve or create conversation
  let conv: { id: string; handledBy: "assistant" | "helper"; profileId: string | null } | null = null;

  if (params.conversationId) {
    const [existing] = await db
      .select({
        id: conversations.id,
        handledBy: conversations.handledBy,
        profileId: conversations.profileId,
      })
      .from(conversations)
      .where(eq(conversations.id, params.conversationId))
      .limit(1);
    if (existing) conv = existing;
  }

  if (!conv && userId) {
    const [userConv] = await db
      .select({
        id: conversations.id,
        handledBy: conversations.handledBy,
        profileId: conversations.profileId,
      })
      .from(conversations)
      .where(and(eq(conversations.profileId, userId), eq(conversations.channel, channel)))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    if (userConv) conv = userConv;
  }

  if (!conv) {
    const [created] = await db
      .insert(conversations)
      .values({
        profileId: userId,
        channel,
        language,
        handledBy: "assistant",
      })
      .returning({
        id: conversations.id,
        handledBy: conversations.handledBy,
        profileId: conversations.profileId,
      });
    conv = created;
  }

  if (!conv) {
    throw new Error("Failed to initialize conversation");
  }

  // 2. Handover Check: When handled_by = helper, return NO assistant reply.
  if (conv.handledBy === "helper") {
    // Persist learner message with handledBy = helper
    await db.insert(messages).values({
      conversationId: conv.id,
      role: "learner",
      content: cleanText,
      handledBy: "helper",
      flags: [],
    });

    return {
      reply: "",
      actions: [],
      sources: [],
      conversationId: conv.id,
    };
  }

  // 3. Persist learner message
  await db.insert(messages).values({
    conversationId: conv.id,
    role: "learner",
    content: cleanText,
    handledBy: "assistant",
    flags: [],
  });

  // 4. Check for distress
  const distressDetected = isDistress(cleanText);

  // 5. Check for explicit human request
  const requestedHuman = isHumanRequest(cleanText);

  // 6. Check for 3 consecutive failed/low-confidence turns
  const threeFailedTurns = await hasThreeFailedTurnsInARow(conv.id, db);

  // 7. Retrieve knowledge chunks
  let knowledgeChunks: any[] = [];
  const minSimilarity = language.startsWith("am") ? 0.05 : 0.2;
  try {
    knowledgeChunks = await retrieve(cleanText, language, 5, {
      db,
      embedder,
      minSimilarity,
    });
  } catch (err) {
    console.warn("Knowledge retrieval failed, proceeding without chunks:", err);
  }

  const sources = knowledgeChunks.map((c) => ({
    title: c.title,
    sourceType: c.sourceType,
    similarity: c.similarity,
  }));

  // 8. Call Gemini with knowledge context, prompts, and tools
  const geminiResult = await callGeminiAssistant({
    text: cleanText,
    language,
    knowledgeChunks,
    pageContext,
    apiKey,
    fetch: customFetch,
    model,
  });

  // 9. Process Escalation
  let escalate: EscalationResult | undefined = undefined;

  // Check if a tool call was request_human
  const requestHumanAction = geminiResult.actions.find((a) => a.name === "request_human");

  const page = pageContext?.page?.toLowerCase() || "";
  const isPaymentPage = page.startsWith("/payment");
  const helpType: HelpRequestType = isPaymentPage ? "payment" : "general";

  if (distressDetected) {
    escalate = {
      type: "urgent",
      reason: "Learner expressed severe distress or crisis",
    };
    await recordUnansweredQuestion(cleanText, {
      language,
      channel,
      notes: "Distress detected",
      db,
    });
  } else if (requestedHuman || requestHumanAction) {
    const actionType = requestHumanAction?.params?.type as HelpRequestType;
    const finalType = (actionType && actionType !== "general") ? actionType : helpType;
    escalate = {
      type: finalType,
      reason: (requestHumanAction?.params?.reason as string) || "Learner requested a human helper",
    };
  } else if (threeFailedTurns) {
    escalate = {
      type: "technical",
      reason: "Three consecutive failed or low-confidence turns in conversation",
    };
    await recordUnansweredQuestion(cleanText, {
      language,
      channel,
      notes: "Three consecutive failed turns",
      db,
    });
  } else if (geminiResult.confidence < 0.6) {
    escalate = {
      type: helpType,
      reason: "Low confidence in knowledge answer",
    };
    await recordUnansweredQuestion(cleanText, {
      language,
      channel,
      notes: "Low model confidence",
      db,
    });
  } else if (
    knowledgeChunks.length === 0 &&
    !cleanText.includes("<job_post>") &&
    !cleanText.includes("<forwarded_message>") &&
    !cleanText.includes("<retrieved_knowledge>") &&
    !isGreetingOrCommand(cleanText)
  ) {
    const isRefusal =
      geminiResult.reply.toLowerCase().includes("scope") ||
      geminiResult.reply.toLowerCase().includes("cannot assist") ||
      geminiResult.reply.includes("ከዚህ ርዕስ ውጭ") ||
      geminiResult.reply.includes("ስርዓት መመሪያዎችን");

    // Only escalate if informative inquiry about content had 0 matching chunks and wasn't refused
    const looksLikeInquiry =
      cleanText.includes("?") ||
      cleanText.toLowerCase().includes("how") ||
      cleanText.toLowerCase().includes("what") ||
      cleanText.toLowerCase().includes("price") ||
      cleanText.toLowerCase().includes("cost") ||
      cleanText.toLowerCase().includes("course");

    if (looksLikeInquiry && !isRefusal) {
      escalate = {
        type: helpType,
        reason: "No relevant knowledge found in knowledge base",
      };
      await recordUnansweredQuestion(cleanText, {
        language,
        channel,
        notes: "No relevant knowledge found",
        db,
      });
    }
  }

  // 10. Persist Assistant Reply
  const messageFlags: string[] = [];
  if (geminiResult.confidence < 0.6) messageFlags.push("low_confidence");
  if (escalate) messageFlags.push("escalated");

  if (geminiResult.reply) {
    await db.insert(messages).values({
      conversationId: conv.id,
      role: "assistant",
      content: geminiResult.reply,
      handledBy: "assistant",
      flags: messageFlags as any,
    });
  }

  return {
    reply: geminiResult.reply,
    actions: geminiResult.actions,
    escalate,
    sources,
    conversationId: conv.id,
    confidence: geminiResult.confidence,
  };
}

function isGreetingOrCommand(text: string): boolean {
  const t = text.toLowerCase().trim();
  const greetings = ["hi", "hello", "hey", "selam", "ሰላም", "stop", "repeat", "help", "menu"];
  return greetings.includes(t) || t.length < 4;
}

/**
 * Summarizes a conversation for a human helper handover.
 */
export async function summarizeConversation(
  conversationId: string,
  options?: { db?: Db | any }
): Promise<string> {
  const db = options?.db ?? getDb();
  try {
    const rows = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(10);

    if (rows.length === 0) return "No prior conversation messages.";

    const dialog = rows.map((r: any) => `${r.role}: ${r.content}`).join("\n");
    return `Learner conversation summary:\n${dialog.slice(0, 500)}`;
  } catch {
    return "Conversation summary unavailable.";
  }
}

