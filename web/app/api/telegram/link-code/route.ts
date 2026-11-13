import "server-only";
import { eq } from "drizzle-orm";
import { withErrors } from "@/lib/auth/errors";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { alertSubscriptions, telegramLinks } from "@/lib/db/schema";
import { generateLinkCode } from "@/lib/telegram/linking";

/**
 * Creates a new one-time linking code for the signed-in learner.
 * Valid for 10 minutes, stored as a SHA-256 hash.
 */
export const POST = withErrors(async () => {
  const actor = await requireActor();
  const { code, expiresAt } = await generateLinkCode(actor.id);

  return Response.json({
    code,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: 600,
  });
});

/**
 * Check linking status for the signed-in learner.
 */
export const GET = withErrors(async () => {
  const actor = await requireActor();
  const db = getDb();

  const [link] = await db.select().from(telegramLinks).where(eq(telegramLinks.profileId, actor.id));

  return Response.json({
    isLinked: !!link,
    telegramId: link ? link.telegramId : null,
    language: link ? link.language : null,
  });
});

/**
 * Unlink Telegram from the web profile.
 */
export const DELETE = withErrors(async () => {
  const actor = await requireActor();
  const db = getDb();

  await db
    .update(alertSubscriptions)
    .set({ active: false })
    .where(eq(alertSubscriptions.profileId, actor.id));

  await db.delete(telegramLinks).where(eq(telegramLinks.profileId, actor.id));

  return Response.json({
    success: true,
    message: "Telegram account unlinked and alerts stopped.",
  });
});
