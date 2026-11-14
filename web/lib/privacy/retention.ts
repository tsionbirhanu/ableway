import { and, eq, gte, lt, sql } from "drizzle-orm";
import { recordAudit } from "@/lib/audit";
import { pruneRateLimits } from "@/lib/auth/rate-limit";
import {
  conversations,
  helpRequests,
  linkCodes,
  messages,
  unansweredQuestions,
  voiceRecordings,
  webauthnChallenges,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/**
 * The retention job. Run daily by Vercel Cron (GET /api/cron/retention).
 *
 * Deletes:
 * - conversations (web and Telegram) whose newest message is older than
 *   CONVERSATION_RETENTION_DAYS; their messages go with them (cascade);
 * - closed help requests and unanswered questions older than the same period
 *   (they hold the learner's own words);
 * - voice recordings past their expiry (set from SPEECH_RETENTION_DAYS when kept);
 * - expired Telegram link codes and passkey challenges, and old rate-limit windows.
 *
 * Writes one audit row with the counts. Safe to run more than once.
 */
export type RetentionConfig = { conversationDays: number };

export type RetentionResult = {
  conversations: number;
  helpRequests: number;
  unansweredQuestions: number;
  voiceRecordings: number;
  linkCodes: number;
  webauthnChallenges: number;
  rateLimitWindows: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runRetention(
  db: Db,
  config: RetentionConfig,
  now: Date = new Date(),
): Promise<RetentionResult> {
  const cutoff = new Date(now.getTime() - config.conversationDays * DAY_MS);
  const oneDayAgo = new Date(now.getTime() - DAY_MS);

  const recentMessage = db
    .select({ one: sql`1` })
    .from(messages)
    .where(and(eq(messages.conversationId, conversations.id), gte(messages.createdAt, cutoff)));
  const deletedConversations = await db
    .delete(conversations)
    .where(and(lt(conversations.createdAt, cutoff), sql`not exists (${recentMessage})`))
    .returning({ id: conversations.id });

  const deletedHelp = await db
    .delete(helpRequests)
    .where(and(eq(helpRequests.status, "done"), lt(helpRequests.updatedAt, cutoff)))
    .returning({ id: helpRequests.id });

  const deletedUnanswered = await db
    .delete(unansweredQuestions)
    .where(lt(unansweredQuestions.createdAt, cutoff))
    .returning({ id: unansweredQuestions.id });

  const deletedRecordings = await db
    .delete(voiceRecordings)
    .where(lt(voiceRecordings.expiresAt, now))
    .returning({ id: voiceRecordings.id });

  const deletedCodes = await db
    .delete(linkCodes)
    .where(lt(linkCodes.expiresAt, oneDayAgo))
    .returning({ id: linkCodes.id });

  const deletedChallenges = await db
    .delete(webauthnChallenges)
    .where(lt(webauthnChallenges.expiresAt, oneDayAgo))
    .returning({ id: webauthnChallenges.id });

  const rateLimitWindows = await pruneRateLimits(db, oneDayAgo);

  const result: RetentionResult = {
    conversations: deletedConversations.length,
    helpRequests: deletedHelp.length,
    unansweredQuestions: deletedUnanswered.length,
    voiceRecordings: deletedRecordings.length,
    linkCodes: deletedCodes.length,
    webauthnChallenges: deletedChallenges.length,
    rateLimitWindows,
  };
  await recordAudit(db, {
    actorId: null,
    action: "retention.purged",
    target: "retention:daily",
    metadata: { conversationDays: config.conversationDays, ...result },
  });
  return result;
}
