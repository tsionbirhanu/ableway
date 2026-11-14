import "server-only";
import { logger } from "@/lib/log";
import { Bot, type Context } from "grammy";
import { requireFeatureKey } from "@/lib/env";
import {
  handleAlertsCommand,
  handleHelpCommand,
  handleHumanCommand,
  handleJobsCommand,
  handleLanguageCommand,
  handleStartCommand,
  handleUnlinkCommand,
} from "./commands";
import {
  handleCallbackQuery,
  handleForwardedOrFileMessage,
  handleTextMessage,
  handleVoiceMessage,
} from "./handlers";

let telegramBot: Bot | undefined;

/**
 * Creates and configures a grammY Bot instance with all command, message,
 * voice, and callback query handlers.
 */
export function createTelegramBot(token: string): Bot {
  const bot = new Bot(token);

  // Global error handler
  bot.catch((err) => {
    logger.error("telegram.bot.error", { updateId: err.ctx.update.update_id, error: err.error });
  });

  // 1. Commands
  bot.command("start", async (ctx) => {
    await handleStartCommand(ctx, ctx.match);
  });

  bot.command("link", async (ctx) => {
    const code = ctx.match?.trim();
    if (code && /^\d{6}$/.test(code)) {
      await handleTextMessage(ctx);
    } else {
      await ctx.reply(
        "Please send the 6-digit code from your web profile, for example: /link 123456",
      );
    }
  });

  bot.command("help", async (ctx) => {
    await handleHelpCommand(ctx, ctx.match);
  });

  bot.command("language", async (ctx) => {
    await handleLanguageCommand(ctx);
  });

  bot.command("jobs", async (ctx) => {
    await handleJobsCommand(ctx);
  });

  bot.command("alerts", async (ctx) => {
    await handleAlertsCommand(ctx);
  });

  bot.command("human", async (ctx) => {
    await handleHumanCommand(ctx);
  });

  bot.command("unlink", async (ctx) => {
    await handleUnlinkCommand(ctx);
  });

  // 2. Callback queries (e.g. language selection inline buttons)
  bot.on("callback_query:data", async (ctx) => {
    await handleCallbackQuery(ctx);
  });

  // 3. Forwarded messages (check before text/file handlers)
  bot.use(async (ctx: Context, next) => {
    const msg = ctx.message;
    if (
      msg &&
      ("forward_origin" in msg ||
        "forward_date" in msg ||
        "forward_from" in msg ||
        "forward_from_chat" in msg)
    ) {
      await handleForwardedOrFileMessage(ctx);
      return;
    }
    await next();
  });

  // 4. File documents
  bot.on("message:document", async (ctx) => {
    await handleForwardedOrFileMessage(ctx);
  });

  // 5. Voice notes
  bot.on("message:voice", async (ctx) => {
    await handleVoiceMessage(ctx);
  });

  // 6. Plain text messages and phrases
  bot.on("message:text", async (ctx) => {
    await handleTextMessage(ctx);
  });

  return bot;
}

/**
 * Returns the Telegram bot singleton instance.
 * Initialization is lazy so importing this module does not require
 * Telegram credentials until the bot is needed.
 */
export function getTelegramBot(): Bot {
  if (telegramBot) {
    return telegramBot;
  }

  const token = requireFeatureKey("TELEGRAM_BOT_TOKEN");
  telegramBot = createTelegramBot(token);
  return telegramBot;
}

/**
 * Test helper: inject a custom or mocked Bot instance.
 */
export function setTelegramBotForTests(bot: Bot | undefined): void {
  telegramBot = bot;
}
