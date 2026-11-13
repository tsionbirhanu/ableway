import { timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import type { Update } from "grammy/types";

import { getEnv } from "@/lib/env";
import { getTelegramBot } from "@/lib/telegram/bot";

export const runtime = "nodejs";

const processedUpdates = new Set<number>();
const inFlightUpdates = new Set<number>();

export function isUpdateProcessed(updateId: number): boolean {
  return processedUpdates.has(updateId) || inFlightUpdates.has(updateId);
}

export function markUpdateInFlight(updateId: number): void {
  inFlightUpdates.add(updateId);
}

export function markUpdateCompleted(updateId: number): void {
  inFlightUpdates.delete(updateId);
  processedUpdates.add(updateId);
  if (processedUpdates.size > 10000) {
    const oldest = processedUpdates.keys().next().value;
    if (oldest !== undefined) processedUpdates.delete(oldest);
  }
}

export function resetProcessedUpdatesForTests(): void {
  processedUpdates.clear();
  inFlightUpdates.clear();
}

export function isValidSecret(received: string | null, expected: string): boolean {
  if (!received) return false;

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

/**
 * Core update processing logic.
 */
export async function processTelegramUpdate(update: Update): Promise<void> {
  const bot = getTelegramBot();
  await bot.handleUpdate(update);
}

export async function POST(request: Request) {
  // 1. Verify Telegram's webhook secret token
  const expectedSecret = getEnv().TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");

  if (!isValidSecret(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse the incoming Telegram update
  let update: Update;
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("update_id" in body) ||
      typeof body.update_id !== "number"
    ) {
      return NextResponse.json({ error: "Invalid Telegram update" }, { status: 400 });
    }

    update = body as Update;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3. Make processing idempotent by update_id
  if (isUpdateProcessed(update.update_id)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  markUpdateInFlight(update.update_id);

  // 4. Acknowledge quickly and do slow work (speech, Gemini) in the background
  const runBackground = async () => {
    try {
      await processTelegramUpdate(update);
    } catch (error) {
      console.error("Telegram update processing failed:", error);
    } finally {
      markUpdateCompleted(update.update_id);
    }
  };

  try {
    after(runBackground);
  } catch {
    // If running in an environment where after() is not registered, execute async
    void runBackground();
  }

  return NextResponse.json({ ok: true });
}
