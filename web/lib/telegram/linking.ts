import "server-only";
import { createHash, randomInt } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { alertSubscriptions, linkCodes, profiles, telegramLinks } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

export function hashLinkCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

/**
 * Creates a one-time linking code on the web profile.
 * Valid for 10 minutes, stored as a SHA-256 hash in link_codes.
 */
export async function generateLinkCode(
  profileId: string,
  customDb?: Db,
): Promise<{ code: string; expiresAt: Date }> {
  const db = customDb ?? getDb();

  // 6-digit one-time code
  const code = randomInt(100000, 1000000).toString();
  const codeHash = hashLinkCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(linkCodes).values({
    profileId,
    codeHash,
    expiresAt,
  });

  return { code, expiresAt };
}

/**
 * Redeem a one-time code sent to the Telegram bot.
 * On success, stores telegram_links with explicit consent and returns profile.
 */
export async function redeemLinkCode(
  code: string,
  telegramId: number,
  language = "en",
  customDb?: Db,
): Promise<{
  success: boolean;
  error?: string;
  profileId?: string;
  learnerName?: string;
  language?: string;
}> {
  const db = customDb ?? getDb();
  const codeHash = hashLinkCode(code);
  const now = new Date();

  // Look for unused, unexpired code
  const [match] = await db
    .select()
    .from(linkCodes)
    .where(
      and(eq(linkCodes.codeHash, codeHash), isNull(linkCodes.usedAt), gt(linkCodes.expiresAt, now)),
    );

  if (!match) {
    return {
      success: false,
      error:
        "The linking code is invalid or has expired. Please generate a new code on your web profile.",
    };
  }

  // Mark code as used
  await db.update(linkCodes).set({ usedAt: now }).where(eq(linkCodes.id, match.id));

  // Retrieve learner profile to check preferred language
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, match.profileId));

  const resolvedLanguage = profile?.language || language;

  // Insert or update telegram_links with explicit consent recorded at now
  await db
    .insert(telegramLinks)
    .values({
      profileId: match.profileId,
      telegramId,
      language: resolvedLanguage,
      consentAt: now,
    })
    .onConflictDoUpdate({
      target: [telegramLinks.profileId],
      set: {
        telegramId,
        language: resolvedLanguage,
        consentAt: now,
      },
    });

  return {
    success: true,
    profileId: match.profileId,
    learnerName: profile?.name || "Learner",
    language: resolvedLanguage,
  };
}

/**
 * Unlink Telegram account and stop all Telegram job alerts.
 */
export async function unlinkTelegram(
  telegramId: number,
  customDb?: Db,
): Promise<{ success: boolean; profileId?: string }> {
  const db = customDb ?? getDb();

  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.telegramId, telegramId));

  if (!link) {
    return { success: false };
  }

  // Stop all Telegram job alerts for this profile
  await db
    .update(alertSubscriptions)
    .set({ active: false })
    .where(
      and(
        eq(alertSubscriptions.profileId, link.profileId),
        eq(alertSubscriptions.channel, "telegram"),
      ),
    );

  // Remove the Telegram link
  await db.delete(telegramLinks).where(eq(telegramLinks.telegramId, telegramId));

  return { success: true, profileId: link.profileId };
}

/**
 * Look up the linked learner profile for a Telegram user ID.
 */
export async function getTelegramLink(telegramId: number, customDb?: Db) {
  const db = customDb ?? getDb();

  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.telegramId, telegramId));

  if (!link) {
    return null;
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, link.profileId));

  return {
    link,
    profile,
  };
}

/**
 * Update the preferred language for a Telegram link.
 */
export async function updateTelegramLanguage(
  telegramId: number,
  language: string,
  customDb?: Db,
): Promise<boolean> {
  const db = customDb ?? getDb();

  const [updated] = await db
    .update(telegramLinks)
    .set({ language })
    .where(eq(telegramLinks.telegramId, telegramId))
    .returning({ id: telegramLinks.id });

  return !!updated;
}
