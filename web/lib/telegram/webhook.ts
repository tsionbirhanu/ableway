import "server-only";
import type { Update } from "grammy/types";
import { safeEqual } from "@/lib/api/secrets";
import { getTelegramBot } from "./bot";

/**
 * Telegram webhook helpers.
 *
 * Spoofing: Telegram sends our TELEGRAM_WEBHOOK_SECRET in the
 * X-Telegram-Bot-Api-Secret-Token header (we set it with setWebhook; see
 * scripts/telegram-webhook.ts). Anything without the exact secret is
 * refused before the body is read, so a forged update never reaches the bot.
 *
 * Replays: Telegram retries an update until we answer 200. We remember
 * recent update_ids so a retry is not handled twice. This memory is per
 * server instance; the bot's own actions are written to be safe to repeat.
 */

const processedUpdates = new Set<number>();
const inFlightUpdates = new Set<number>();
const MAX_REMEMBERED = 10_000;

export function isUpdateProcessed(updateId: number): boolean {
  return processedUpdates.has(updateId) || inFlightUpdates.has(updateId);
}

export function markUpdateInFlight(updateId: number): void {
  inFlightUpdates.add(updateId);
}

export function markUpdateCompleted(updateId: number): void {
  inFlightUpdates.delete(updateId);
  processedUpdates.add(updateId);
  if (processedUpdates.size > MAX_REMEMBERED) {
    const oldest = processedUpdates.keys().next().value;
    if (oldest !== undefined) processedUpdates.delete(oldest);
  }
}

export function resetProcessedUpdatesForTests(): void {
  processedUpdates.clear();
  inFlightUpdates.clear();
}

export function isValidSecret(received: string | null, expected: string): boolean {
  return safeEqual(received, expected);
}

export async function processTelegramUpdate(update: Update): Promise<void> {
  await getTelegramBot().handleUpdate(update);
}
