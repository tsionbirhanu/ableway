import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { InputFile, type Context } from "grammy";
import { askAssistant } from "@/lib/assistant/assistant";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { logger } from "@/lib/log";
import { synthesizeVoiceNote, transcribeVoiceNote } from "@/lib/speech";
import { MAX_AUDIO_BYTES } from "@/lib/speech/audio";
import { SpeechError } from "@/lib/speech/types";
import {
  getUnlinkedMessage,
  handleAlertsCommand,
  handleHelpCommand,
  handleHumanCommand,
  handleJobsCommand,
  handleLanguageCommand,
  handleStartCommand,
  handleUnlinkCommand,
} from "./commands";
import { getTelegramLink, redeemLinkCode, updateTelegramLanguage } from "./linking";

/**
 * Checks if the conversation for this profile is currently being handled by a human helper.
 */
async function isHelperInCharge(
  profileId: string,
): Promise<{ inCharge: boolean; convId?: string }> {
  const db = getDb();
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.profileId, profileId), eq(conversations.channel, "telegram")))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (conv && conv.handledBy === "helper") {
    return { inCharge: true, convId: conv.id };
  }
  return { inCharge: false, convId: conv?.id };
}

/**
 * Handle incoming text messages.
 * Matches commands, plain phrases, 6-digit link codes, or general assistant chat.
 */
export async function handleTextMessage(ctx: Context) {
  const text = ctx.message?.text?.trim();
  const telegramId = ctx.from?.id;
  if (!text || !telegramId) return;

  const lower = text.toLowerCase().trim();

  // 1. Plain phrases for commands
  if (lower === "start" || lower.startsWith("start ")) {
    const payload = lower.replace(/^start\s*/, "");
    await handleStartCommand(ctx, payload);
    return;
  }
  if (
    lower === "help" ||
    lower === "commands" ||
    lower === "guide" ||
    lower.startsWith("help ") ||
    lower.startsWith("guide ")
  ) {
    const query = lower.replace(/^(help|guide)\s+/, "");
    await handleHelpCommand(ctx, query === lower ? undefined : query);
    return;
  }
  if (lower === "language" || lower === "lang" || lower === "change language" || lower === "ቋንቋ") {
    await handleLanguageCommand(ctx);
    return;
  }
  if (
    lower === "jobs" ||
    lower === "job" ||
    lower === "find jobs" ||
    lower === "ሥራ" ||
    lower === "ስራዎች"
  ) {
    await handleJobsCommand(ctx);
    return;
  }
  if (lower === "alerts" || lower === "alert" || lower === "job alerts" || lower === "ማንቂያዎች") {
    await handleAlertsCommand(ctx);
    return;
  }
  if (
    lower === "human" ||
    lower === "helper" ||
    lower === "call human" ||
    lower === "talk to a person" ||
    lower === "ሰው ጥራልኝ" ||
    lower === "አጋዥ"
  ) {
    await handleHumanCommand(ctx);
    return;
  }
  if (lower === "unlink" || lower === "disconnect" || lower === "stop alerts" || lower === "አላቅቅ") {
    await handleUnlinkCommand(ctx);
    return;
  }

  // 2. Check for 6-digit linking code (e.g. "123456" or "/link 123456")
  const codeMatch = text.match(/\b\d{6}\b/);
  if (codeMatch) {
    const code = codeMatch[0];
    const linkResult = await redeemLinkCode(code, telegramId);
    if (linkResult.success) {
      const confirmText = linkResult.language?.startsWith("am")
        ? `የቴሌግራም መለያዎ በተሳካ ሁኔታ ተገናኝቷል! አሁን የሥራ ማንቂያዎችን እና የኮርስ መረጃዎችን ይቀበላሉ።`
        : `Your Telegram account is linked successfully! You will now receive course updates and job alerts.`;
      await ctx.reply(confirmText);
      return;
    }
    await ctx.reply(
      linkResult.error ||
        "The code is invalid or has expired. Please generate a new code from your web profile.",
    );
    return;
  }

  // 3. Check linking status
  const linked = await getTelegramLink(telegramId);
  if (!linked) {
    await ctx.reply(getUnlinkedMessage());
    return;
  }

  const { profile, link } = linked;
  const lang = link.language || "en";

  // 4. Check if a human helper is currently in charge
  const { inCharge, convId } = await isHelperInCharge(profile.id);
  if (inCharge) {
    // Record message into conversation for the helper; bot stays silent
    if (convId) {
      const db = getDb();
      await db.insert(messages).values({
        conversationId: convId,
        role: "learner",
        content: text,
        flags: [],
        handledBy: "helper",
      });
    }
    return;
  }

  // 5. Normal assistant chat
  const assistantResult = await askAssistant({
    message: text,
    channel: "telegram",
    profileId: profile.id,
    language: lang,
  });

  if (assistantResult.escalateToHuman) {
    await handleHumanCommand(ctx);
    return;
  }

  await ctx.reply(assistantResult.reply);
}

/**
 * Handle incoming voice notes.
 * Downloads the voice file, converts/transcribes it, calls askAssistant with channel = "telegram",
 * and replies with voice if the learner sent voice (also sends the text).
 */
export async function handleVoiceMessage(ctx: Context) {
  const telegramId = ctx.from?.id;
  const voice = ctx.message?.voice;
  if (!telegramId || !voice) return;

  const linked = await getTelegramLink(telegramId);
  if (!linked) {
    await ctx.reply(getUnlinkedMessage());
    return;
  }

  const { profile, link } = linked;
  const lang = link.language || "en";

  // Check helper status
  const { inCharge, convId } = await isHelperInCharge(profile.id);
  if (inCharge) {
    if (convId) {
      const db = getDb();
      await db.insert(messages).values({
        conversationId: convId,
        role: "learner",
        content: "[Voice Note]",
        flags: [],
        handledBy: "helper",
      });
    }
    return;
  }

  const notUnderstood = lang.startsWith("am")
    ? "ይቅርታ፣ የድምጽ መልእክቱን መረዳት አልቻልኩም። እባክዎ እንደገና ይሞክሩ ወይም ይጻፉ።"
    : "Sorry, I could not understand that voice note. Please try again, or type your message.";

  // Telegram tells us the size first, so a huge file is never downloaded.
  if (voice.file_size !== undefined && voice.file_size > MAX_AUDIO_BYTES) {
    await ctx.reply(new SpeechError("audio_too_large").message);
    return;
  }

  let audio: Uint8Array;
  try {
    const file = await ctx.getFile();
    if (!file.file_path) throw new Error("Telegram returned no file path");
    // The bot token is part of Telegram's file URL. It is never logged.
    const response = await fetch(
      `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`,
    );
    if (!response.ok) throw new Error(`Telegram file download failed (${response.status})`);
    audio = new Uint8Array(await response.arrayBuffer());
    if (audio.length > MAX_AUDIO_BYTES) throw new SpeechError("audio_too_large");
  } catch (error) {
    logger.warn("telegram.voice.download_failed", { error });
    await ctx.reply(error instanceof SpeechError ? error.message : notUnderstood);
    return;
  }

  let transcript: string;
  try {
    transcript = await transcribeVoiceNote(audio, lang, profile.id);
  } catch (error) {
    if (!(error instanceof SpeechError))
      logger.error("telegram.voice.transcribe_failed", { error });
    await ctx.reply(error instanceof SpeechError ? error.message : notUnderstood);
    return;
  }

  // Call assistant with channel = "telegram"
  const assistantResult = await askAssistant({
    message: transcript,
    channel: "telegram",
    profileId: profile.id,
    language: lang,
  });

  if (assistantResult.escalateToHuman) {
    await handleHumanCommand(ctx);
    return;
  }

  // Reply with voice because the learner sent voice, and always send the text too.
  await replyWithVoiceIfPossible(ctx, assistantResult.reply, lang, "reply.ogg");
  await ctx.reply(assistantResult.reply);
}

/**
 * Handle forwarded messages and files.
 * Reads aloud and summarizes them, treating content as untrusted data.
 */
export async function handleForwardedOrFileMessage(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const linked = await getTelegramLink(telegramId);
  if (!linked) {
    await ctx.reply(getUnlinkedMessage());
    return;
  }

  const { profile, link } = linked;
  const lang = link.language || "en";

  // Check helper status
  const { inCharge, convId } = await isHelperInCharge(profile.id);
  if (inCharge) {
    if (convId) {
      const db = getDb();
      await db.insert(messages).values({
        conversationId: convId,
        role: "learner",
        content: "[Forwarded message / file]",
        flags: [],
        handledBy: "helper",
      });
    }
    return;
  }

  // Extract untrusted text content from forwarded message or file/document
  let untrustedContent = "";
  if (ctx.message?.text) {
    untrustedContent = ctx.message.text;
  } else if (ctx.message?.caption) {
    untrustedContent = ctx.message.caption;
  } else if (ctx.message?.document) {
    untrustedContent = `Document named "${ctx.message.document.file_name || "file"}" was received.`;
  } else {
    untrustedContent = "An attached media item was received.";
  }

  // Call assistant with isUntrustedData = true
  const assistantResult = await askAssistant({
    message: untrustedContent,
    channel: "telegram",
    profileId: profile.id,
    language: lang,
    isUntrustedData: true,
  });

  // Read aloud (voice note) and summarise (text)
  await replyWithVoiceIfPossible(ctx, assistantResult.reply, lang, "summary.ogg");
  await ctx.reply(assistantResult.reply);
}

/** Send a voice note of `text`. If speech fails, the text reply that follows is enough. */
async function replyWithVoiceIfPossible(
  ctx: Context,
  text: string,
  language: string,
  filename: string,
): Promise<void> {
  try {
    const voice = await synthesizeVoiceNote(text, language);
    await ctx.replyWithVoice(new InputFile(voice, filename));
  } catch (error) {
    logger.warn("telegram.voice.synthesize_failed", { error });
  }
}

/**
 * Handle inline button callback queries (e.g. language selection).
 */
export async function handleCallbackQuery(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  const telegramId = ctx.from?.id;
  if (!data || !telegramId) return;

  if (data.startsWith("lang:")) {
    const selectedLang = data.replace("lang:", "");
    await updateTelegramLanguage(telegramId, selectedLang);

    const confirmation =
      selectedLang === "am" ? "ቋንቋው ወደ አማርኛ ተቀይሯል።" : "Language updated to English.";

    await ctx.answerCallbackQuery({ text: confirmation });
    await ctx.reply(confirmation);
  }
}
