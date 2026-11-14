import { after } from "next/server";
import type { Update } from "grammy/types";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { BadRequestError, UnauthorizedError } from "@/lib/auth/errors";
import { readJson } from "@/lib/auth/params";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/log";
import {
  isUpdateProcessed,
  isValidSecret,
  markUpdateCompleted,
  markUpdateInFlight,
  processTelegramUpdate,
} from "@/lib/telegram/webhook";

/** Telegram updates are small JSON objects; 1 MB is far above any real one. */
const MAX_UPDATE_BYTES = 1024 * 1024;

/** Only the envelope is checked here; grammY validates the update's contents. */
const updateEnvelope = z.looseObject({ update_id: z.number().int().nonnegative() });

export const POST = withApi(
  // Authenticated by the secret header, not cookies, so the CSRF check does not apply.
  { rateLimit: "telegramWebhook", csrf: false, maxBodyBytes: MAX_UPDATE_BYTES },
  async (request: Request) => {
    // 1. Refuse anything without Telegram's secret header, before reading the body.
    const received = request.headers.get("x-telegram-bot-api-secret-token");
    if (!isValidSecret(received, getEnv().TELEGRAM_WEBHOOK_SECRET)) {
      logger.warn("telegram.webhook.bad_secret");
      throw new UnauthorizedError("Unauthorized");
    }

    // 2. Parse and check the update envelope.
    const parsed = updateEnvelope.safeParse(await readJson(request));
    if (!parsed.success) throw new BadRequestError("Invalid Telegram update");
    const update = parsed.data as unknown as Update;

    // 3. Handle each update_id once.
    if (isUpdateProcessed(update.update_id)) {
      return Response.json({ ok: true, duplicate: true });
    }
    markUpdateInFlight(update.update_id);

    // 4. Answer quickly; do slow work (speech, Gemini) after the response.
    const runBackground = async () => {
      try {
        await processTelegramUpdate(update);
      } catch (error) {
        logger.error("telegram.update.failed", { error });
      } finally {
        markUpdateCompleted(update.update_id);
      }
    };
    try {
      after(runBackground);
    } catch {
      // Outside a request scope (tests), run without after().
      void runBackground();
    }

    return Response.json({ ok: true });
  },
);
