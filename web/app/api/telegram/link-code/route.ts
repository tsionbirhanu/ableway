import { eq } from "drizzle-orm";
import { withApi } from "@/lib/api/handler";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { telegramLinks } from "@/lib/db/schema";
import { generateLinkCode, unlinkTelegramForProfile } from "@/lib/telegram/linking";

/**
 * Creates a new one-time linking code for the signed-in learner.
 * Valid for 10 minutes, stored as a SHA-256 hash. Guesses are rate limited
 * per Telegram account when the code is redeemed.
 */
export const POST = withApi({}, async (_request: Request) => {
  const actor = await requireActor();
  const { code, expiresAt } = await generateLinkCode(actor.id);
  return Response.json({
    code,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: 600,
  });
});

/** Linking status for the signed-in learner. */
export const GET = withApi({}, async (_request: Request) => {
  const actor = await requireActor();
  const [link] = await getDb()
    .select({ telegramId: telegramLinks.telegramId, language: telegramLinks.language })
    .from(telegramLinks)
    .where(eq(telegramLinks.profileId, actor.id));
  return Response.json({
    isLinked: Boolean(link),
    telegramId: link?.telegramId ?? null,
    language: link?.language ?? null,
  });
});

/** Unlink Telegram from the web profile and stop Telegram alerts. */
export const DELETE = withApi({}, async (_request: Request) => {
  const actor = await requireActor();
  await unlinkTelegramForProfile(actor.id);
  return Response.json({
    success: true,
    message: "Telegram account unlinked and alerts stopped.",
  });
});
