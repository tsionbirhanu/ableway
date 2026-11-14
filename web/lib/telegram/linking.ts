import "server-only";
import { createHash, randomInt } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { recordAudit } from "@/lib/audit";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { getDb } from "@/lib/db/client";
import { recordConsent } from "@/lib/privacy/consent";
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

  // Codes are 6 digits, so limit guesses per Telegram account.
  const attempt = await hit(db, `tg-link:${telegramId}`, LIMITS.telegramLinkPerAccount, now);
  if (!attempt.allowed) {
    return {
      success: false,
      error: "Too many tries. Please wait 15 minutes, then send the code again.",
    };
  }

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

  // Mark the code used. The condition makes this atomic: if two messages
  // race with the same code, only one of them links.
  const [claimed] = await db
    .update(linkCodes)
    .set({ usedAt: now })
    .where(and(eq(linkCodes.id, match.id), isNull(linkCodes.usedAt)))
    .returning({ id: linkCodes.id });
  if (!claimed) {
    return {
      success: false,
      error:
        "The linking code is invalid or has expired. Please generate a new code on your web profile.",
    };
  }

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
  // Sending the code from Telegram is the learner's opt-in to bot messages.
  await recordConsent(db, {
    profileId: match.profileId,
    purpose: "telegram_messages",
    granted: true,
    source: "telegram",
  });

  return {
    success: true,
    profileId: match.profileId,
    learnerName: profile?.name || "Learner",
    language: resolvedLanguage,
  };
}

/**
 * Unlink a Telegram account: stop Telegram job alerts, delete the link,
 * record the withdrawn consent, and write an audit row.
 */
async function removeLink(
  db: Db,
  link: { profileId: string; telegramId: number },
  source: "web" | "telegram",
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(alertSubscriptions)
      .set({ active: false })
      .where(
        and(
          eq(alertSubscriptions.profileId, link.profileId),
          eq(alertSubscriptions.channel, "telegram"),
        ),
      );
    await tx.delete(telegramLinks).where(eq(telegramLinks.telegramId, link.telegramId));
    await recordAudit(tx, {
      actorId: link.profileId,
      action: "telegram.unlinked",
      target: `profiles:${link.profileId}`,
      metadata: { source },
    });
  });
  await recordConsent(db, {
    profileId: link.profileId,
    purpose: "telegram_messages",
    granted: false,
    source,
  });
}

/** Unlink from Telegram (the learner sent /unlink). */
export async function unlinkTelegram(
  telegramId: number,
  customDb?: Db,
): Promise<{ success: boolean; profileId?: string }> {
  const db = customDb ?? getDb();
  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.telegramId, telegramId));
  if (!link) return { success: false };
  await removeLink(db, link, "telegram");
  return { success: true, profileId: link.profileId };
}

/** Unlink from the web profile. */
export async function unlinkTelegramForProfile(
  profileId: string,
  customDb?: Db,
): Promise<{ success: boolean }> {
  const db = customDb ?? getDb();
  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.profileId, profileId));
  if (!link) return { success: false };
  await removeLink(db, link, "web");
  return { success: true };
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
