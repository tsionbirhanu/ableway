import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { messages, unansweredQuestions } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { EscalationResult, HelpRequestType } from "./types";

const HUMAN_REQUEST_KEYWORDS_EN = [
  "human helper",
  "call a person",
  "call person",
  "call human",
  "call staff",
  "talk to a human",
  "talk to human",
  "talk to person",
  "speak with a person",
  "speak with human",
  "speak to a person",
  "speak to person",
  "speak to an agent",
  "talk to an agent",
  "connect me with a person",
  "i need a human",
  "i want a human",
  "real person",
  "human support",
  "human assistance",
];

const HUMAN_REQUEST_KEYWORDS_AM = [
  "ሰው አገናኙኝ",
  "ከሰው ጋር መነጋገር እፈልጋለሁ",
  "ከሰው ጋር አገናኙኝ",
  "አጋዥ ጥራልኝ",
  "ሰው ጥራልኝ",
  "የሰው እርዳታ",
  "ከአጋዥ ጋር",
  "አጋዥ አገናኙኝ",
];

const DISTRESS_KEYWORDS_EN = [
  "want to die",
  "kill myself",
  "end my life",
  "hurt myself",
  "suicide",
  "self-harm",
  "self harm",
  "giving up on life",
  "can't live anymore",
  "cannot live anymore",
  "i want to disappear forever",
];

const DISTRESS_KEYWORDS_AM = [
  "መሞት እፈልጋለሁ",
  "ራሴን ላጠፋ",
  "ሕይወቴን ላጥፋ",
  "ተስፋ ቆርጫለሁ",
];

/**
 * Checks if the text explicitly requests human assistance.
 */
export function isHumanRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    HUMAN_REQUEST_KEYWORDS_EN.some((kw) => lower.includes(kw)) ||
    HUMAN_REQUEST_KEYWORDS_AM.some((kw) => lower.includes(kw))
  );
}

/**
 * Checks if the text indicates severe distress or crisis.
 */
export function isDistress(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    DISTRESS_KEYWORDS_EN.some((kw) => lower.includes(kw)) ||
    DISTRESS_KEYWORDS_AM.some((kw) => lower.includes(kw))
  );
}

/**
 * Checks if the conversation has had 3 consecutive failed or low-confidence turns.
 */
export async function hasThreeFailedTurnsInARow(conversationId: string, db: Db | any): Promise<boolean> {
  if (!conversationId) return false;
  try {
    const recent = await db
      .select({ flags: messages.flags })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(6);

    if (recent.length < 3) return false;

    // Check last 3 messages for failed or low-confidence flags
    const lastThree = recent.slice(-3);
    const allThreeFailed = lastThree.every((m: any) => {
      const flags = Array.isArray(m.flags) ? m.flags : [];
      return flags.includes("low_confidence") || flags.includes("failed") || flags.includes("unanswered");
    });

    return allThreeFailed;
  } catch {
    return false;
  }
}

/**
 * Records an escalated or unanswered question in unanswered_questions for staff review.
 */
export async function recordUnansweredQuestion(
  text: string,
  options: {
    language?: string;
    channel?: "web" | "telegram";
    notes?: string;
    db?: Db | any;
  }
): Promise<void> {
  const clean = text.trim();
  if (!clean) return;

  const db = options.db ?? getDb();
  try {
    await db.insert(unansweredQuestions).values({
      text: clean,
      language: options.language || "en",
      channel: options.channel || "web",
      resolved: false,
      notes: options.notes ?? null,
    });
  } catch (err) {
    console.error("Failed to record unanswered question:", err);
  }
}

