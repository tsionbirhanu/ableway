import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { conversations, messages, telegramLinks } from "@/lib/db/schema";
import { getTelegramBot } from "./bot";
import type { Db } from "@/lib/db/types";

/**
 * Relay a human helper message into the learner's Telegram chat.
 * Also persists the message to the conversation with role = "helper".
 */
export async function relayHelperMessage(
  profileId: string,
  text: string,
  customDb?: Db,
): Promise<{ success: boolean; error?: string }> {
  const db = customDb ?? getDb();

  // Find linked telegram ID
  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.profileId, profileId));

  if (!link) {
    return { success: false, error: "Learner is not linked to Telegram." };
  }

  // Find or create conversation
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.profileId, profileId), eq(conversations.channel, "telegram")))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (conv) {
    await db.insert(messages).values({
      conversationId: conv.id,
      role: "helper",
      content: text,
      flags: [],
      handledBy: "helper",
    });
  }

  // Send message to learner in Telegram
  const bot = getTelegramBot();
  await bot.api.sendMessage(link.telegramId, text);

  return { success: true };
}

/**
 * End a helper handover session and return the conversation to the bot.
 */
export async function resolveHelperSession(profileId: string, customDb?: Db): Promise<boolean> {
  const db = customDb ?? getDb();

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.profileId, profileId), eq(conversations.channel, "telegram")))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (!conv) return false;

  await db
    .update(conversations)
    .set({ handledBy: "assistant" })
    .where(eq(conversations.id, conv.id));

  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.profileId, profileId));

  if (link) {
    const bot = getTelegramBot();
    const notice = link.language?.startsWith("am")
      ? "የሰው አጋዥ ውይይቱን አጠናቋል። ረዳት ቦቱ ተመልሷል።"
      : "Your helper has finished the session. The Ableway assistant is back to help you.";
    await bot.api.sendMessage(link.telegramId, notice);
  }

  return true;
}
