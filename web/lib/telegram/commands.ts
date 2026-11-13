import "server-only";
import { and, eq } from "drizzle-orm";
import { InlineKeyboard, type Context } from "grammy";
import { getDb } from "@/lib/db/client";
import { alertSubscriptions, conversations, helpRequests, jobs } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { TELEGRAM_GUIDES, formatGuide, getAllGuidesOverview } from "./guides";
import { getTelegramLink, redeemLinkCode, unlinkTelegram } from "./linking";

export function getUnlinkedMessage(lang = "en"): string {
  const appUrl = getEnv().APP_URL;
  if (lang.startsWith("am")) {
    return `ይህን ቦት ለመጠቀም እባክዎ መለያዎን ከድረ-ገጻችን ጋር ያገናኙ። በ ${appUrl}/profile ገጽ ላይ ባለ 6 ድጂት ኮድ ይፍጠሩ እና ኮዱን እዚህ ይላኩልን።`;
  }
  return `To use this bot, please link your account on our website. Generate a 6-digit code at ${appUrl}/profile and send the code here.`;
}

/**
 * /start command handler.
 * Shows welcome, language buttons, what the bot can and cannot do.
 */
export async function handleStartCommand(ctx: Context, payload?: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // Check if a linking code was passed via deep link: /start 123456
  const cleanPayload = payload?.trim() || "";
  if (/^\d{6}$/.test(cleanPayload)) {
    const linkResult = await redeemLinkCode(cleanPayload, telegramId);
    if (linkResult.success) {
      const confirmText = linkResult.language?.startsWith("am")
        ? `እንኳን ደህና መጡ ${linkResult.learnerName}! የቴሌግራም መለያዎ በተሳካ ሁኔታ ተገናኝቷል። አሁን የሥራ ማስታወቂያዎችን እና የትምህርት መረጃዎችን ያገኛሉ።`
        : `Welcome ${linkResult.learnerName}! Your Telegram account is successfully connected. You will now receive course updates and job alerts.`;
      await ctx.reply(confirmText);
      return;
    }
  }

  const linked = await getTelegramLink(telegramId);
  const lang = linked?.link?.language || "en";

  const keyboard = new InlineKeyboard().text("English", "lang:en").text("አማርኛ", "lang:am");

  if (lang.startsWith("am")) {
    const welcome = [
      "እንኳን ወደ ኤብልዌይ በደህና መጡ። እኔ የእርስዎ ተደራሽ የትምህርት እና የሥራ ረዳት ነኝ።",
      "",
      "እኔ ማድረግ የምችላቸው ነገሮች፦",
      "1. ተደራሽ የቴክኖሎጂ ኮርሶችን ማስተዋወቅ",
      "2. ለእይታ እክል ላለባቸው ተማሪዎች የተረጋገጡ ስራዎችን ማሳየት",
      "3. ፈጣን የሥራ ማስታወቂያዎችን መላክ",
      "4. የተላለፉ መልዕክቶችን እና ሰነዶችን ማንበብ እና ማጠቃለል",
      "5. ከቀጥታ የሰው አጋዥ ጋር ማገናኘት",
      "",
      "እኔ ማድረግ የማልችላቸው ነገሮች፦ ሌሎችን የቴሌግራም ውይይቶችዎን ማየት አልችልም። ክፍያዎችን በቀጥታ መቀበል አልችልም።",
      "",
      linked ? "" : getUnlinkedMessage("am"),
    ]
      .filter(Boolean)
      .join("\n");

    await ctx.reply(welcome, { reply_markup: keyboard });
    return;
  }

  const welcome = [
    "Welcome to Ableway. I am your accessible learning and job assistant.",
    "",
    "Here is what I can do:",
    "1. Guide you through accessible tech courses.",
    "2. Find verified jobs for blind and visually impaired learners.",
    "3. Send instant job alerts.",
    "4. Read and summarize forwarded messages and files.",
    "5. Connect you with a human helper.",
    "",
    "Here is what I cannot do: I cannot see your other Telegram chats. I cannot process payments directly.",
    "",
    linked ? "" : getUnlinkedMessage("en"),
  ]
    .filter(Boolean)
    .join("\n");

  await ctx.reply(welcome, { reply_markup: keyboard });
}

/**
 * /help command handler.
 * Provides step-by-step guides from the knowledge base.
 */
export async function handleHelpCommand(ctx: Context, query?: string) {
  const telegramId = ctx.from?.id;
  const linked = telegramId ? await getTelegramLink(telegramId) : null;
  const lang = linked?.link?.language || "en";

  const cleanQuery = query?.toLowerCase().trim() || "";

  if (cleanQuery.includes("voice") || cleanQuery.includes("message") || cleanQuery === "1") {
    await ctx.reply(formatGuide(TELEGRAM_GUIDES.messages));
    return;
  }
  if (cleanQuery.includes("channel") || cleanQuery === "2") {
    await ctx.reply(formatGuide(TELEGRAM_GUIDES.channels));
    return;
  }
  if (cleanQuery.includes("forward") || cleanQuery === "3") {
    await ctx.reply(formatGuide(TELEGRAM_GUIDES.forwarding));
    return;
  }
  if (cleanQuery.includes("setting") || cleanQuery === "4") {
    await ctx.reply(formatGuide(TELEGRAM_GUIDES.settings));
    return;
  }

  await ctx.reply(getAllGuidesOverview(lang));
}

/**
 * /language command handler.
 * Shows inline buttons to switch preferred language.
 */
export async function handleLanguageCommand(ctx: Context) {
  const keyboard = new InlineKeyboard().text("English", "lang:en").text("አማርኛ", "lang:am");

  await ctx.reply("Please choose your preferred language / እባክዎ ቋንቋዎን ይምረጡ:", {
    reply_markup: keyboard,
  });
}

/**
 * /jobs command handler.
 * Lists up to 5 verified published job openings.
 */
export async function handleJobsCommand(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const linked = await getTelegramLink(telegramId);
  if (!linked) {
    await ctx.reply(getUnlinkedMessage());
    return;
  }

  const db = getDb();
  const jobList = await db
    .select({
      title: jobs.title,
      employer: jobs.employer,
      location: jobs.location,
    })
    .from(jobs)
    .where(eq(jobs.status, "published"))
    .limit(5);

  if (jobList.length === 0) {
    await ctx.reply("There are no new job openings right now. Check back soon.");
    return;
  }

  const lines = ["Here are recent verified job openings:"];
  jobList.forEach((j, index) => {
    lines.push(`${index + 1}. ${j.title} at ${j.employer} in ${j.location}.`);
  });
  lines.push("Visit the website to read details and apply.");

  await ctx.reply(lines.join("\n"));
}

/**
 * /alerts command handler.
 * Shows current Telegram alert subscription status.
 */
export async function handleAlertsCommand(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const linked = await getTelegramLink(telegramId);
  if (!linked) {
    await ctx.reply(getUnlinkedMessage());
    return;
  }

  const db = getDb();
  const [subscription] = await db
    .select()
    .from(alertSubscriptions)
    .where(
      and(
        eq(alertSubscriptions.profileId, linked.profile.id),
        eq(alertSubscriptions.channel, "telegram"),
      ),
    )
    .limit(1);

  if (subscription && subscription.active) {
    await ctx.reply(
      "Your Telegram job alerts are active. You will receive messages when new jobs match your preferences. Send unlink to stop alerts.",
    );
  } else {
    await ctx.reply(
      "Your Telegram job alerts are not active. You can manage alert preferences on your web profile.",
    );
  }
}

/**
 * /human command handler.
 * Creates a help request, flags conversation for helper, and mutes bot.
 */
export async function handleHumanCommand(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const db = getDb();
  const linked = await getTelegramLink(telegramId);
  const profileId = linked?.profile.id ?? null;
  const lang = linked?.link?.language || "en";

  // 1. Create a help request
  await db.insert(helpRequests).values({
    profileId,
    type: "telegram",
    trigger: "learner",
    reason: "Learner requested a human helper in Telegram",
    status: "waiting",
    channel: "telegram",
  });

  // 2. Set conversation to handledBy = "helper" so the bot stays silent
  if (profileId) {
    const [existingConv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.profileId, profileId), eq(conversations.channel, "telegram")))
      .limit(1);

    if (existingConv) {
      await db
        .update(conversations)
        .set({ handledBy: "helper" })
        .where(eq(conversations.id, existingConv.id));
    } else {
      await db.insert(conversations).values({
        profileId,
        channel: "telegram",
        language: lang,
        handledBy: "helper",
      });
    }
  }

  const responseText = lang.startsWith("am")
    ? "የሰው አጋዥ እንዲረዳዎት ጥያቄ አቅርቤያለሁ። አጋዥ በቅርቡ ወደዚህ ውይይት ይቀላቀላል። አጋዡ እስኪያጠናቅቅ ድረስ እኔ ዝም እላለሁ።"
    : "I have requested a human helper for you. A helper will join this chat soon. I will stay silent until the helper finishes.";

  await ctx.reply(responseText);
}

/**
 * /unlink command handler.
 * Unlinks account and deactivates alerts.
 */
export async function handleUnlinkCommand(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const result = await unlinkTelegram(telegramId);
  if (result.success) {
    await ctx.reply("Your Telegram account has been unlinked. All job alerts have been stopped.");
  } else {
    await ctx.reply("Your Telegram account is not linked to an Ableway profile.");
  }
}
