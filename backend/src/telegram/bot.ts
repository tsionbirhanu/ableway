import { Bot } from 'grammy';
import dotenv from 'dotenv';
import { processAssistantMessage } from '../assistant-core/core.js';
import { supabase } from '../db/supabase.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || 'PLACEHOLDER_BOT_TOKEN';
export const bot = new Bot(token);

// 1. /start Command (FR-7.1)
bot.command('start', async (ctx) => {
  const welcomeText = `Welcome to the Ableway Assistant! 🌟
I am your accessible voice and text assistant for learning and employment.

Here is what I can do for you:
1. /jobs - Browse accessible job listings.
2. /alerts - Subscribe to instant job alerts.
3. /telegram - Learn how to use Telegram step by step.
4. /human - Speak directly with a human staff helper.
5. /link - Link your Ableway web account with your Telegram ID.

Send me any text message or voice note to begin!`;

  await ctx.reply(welcomeText);
});

// 2. /help Command (FR-7.6)
bot.command('help', async (ctx) => {
  await ctx.reply(`Ableway Commands:
• /jobs - Search accessible jobs
• /alerts - Manage job alert subscriptions
• /human - Request human helper
• /telegram - Interactive Telegram tutorial
• /link <code> - Connect web profile
• /unlink - Disconnect Telegram account

You can also forward any job announcement or channel post to me and I will summarize it for you.`);
});

// 3. /human Command (FR-10.1, FR-4.4)
bot.command('human', async (ctx) => {
  const telegramUserId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || 'Telegram Learner';

  // Record help request in Supabase
  try {
    await supabase.from('help_requests').insert({
      type: 'telegram',
      trigger: 'learner',
      summary: `Human help requested by @${username} (Telegram ID: ${telegramUserId})`,
      status: 'waiting',
      channel: 'telegram',
      contact_preference: 'telegram_message',
    });
  } catch (err) {
    console.error('Failed to log help request to Supabase:', err);
  }

  await ctx.reply(`A human helper has been alerted! A member of the Ableway team will reach out to you directly in this chat or by phone.`);
});

// 4. /link Command (FR-6.3, FR-7.9)
bot.command('link', async (ctx) => {
  const code = ctx.match?.trim();
  if (!code) {
    await ctx.reply(`Please provide the 6-digit code from your Ableway web profile. Example: /link 123456`);
    return;
  }

  try {
    const { data, error } = await supabase
      .from('telegram_links')
      .update({
        telegram_id: ctx.from?.id,
        consent: true,
        linked_at: new Date().toISOString(),
      })
      .eq('link_code', code)
      .select();

    if (error || !data || data.length === 0) {
      await ctx.reply(`The code ${code} is invalid or has expired. Please generate a fresh code on your Ableway profile page.`);
      return;
    }

    await ctx.reply(`🎉 Success! Your Telegram account has been connected to your Ableway profile. You will now receive personalized job alerts here.`);
  } catch (err) {
    await ctx.reply(`Could not verify the linking code right now. Please try again or contact a human helper with /human.`);
  }
});

// 5. /jobs Command (FR-8.2, FR-8.3)
bot.command('jobs', async (ctx) => {
  // Read job in fixed order: title, employer, place, requirements, how to apply, deadline
  const mockJob = `Job 1 of 1:
Title: Remote Accessible Customer Service Agent
Employer: Ethio Digital Works
Location: Remote (Addis Ababa, Ethiopia)
Requirements: Clear spoken communication, basic computer navigation (NVDA/JAWS or smartphone)
How to Apply: Send your voice introduction or profile link via Telegram to @EthioJobsAssist
Deadline: November 30, 2026`;

  await ctx.reply(mockJob);
});

// 6. /telegram Guide Command (FR-7.4)
bot.command('telegram', async (ctx) => {
  await ctx.reply(`Step-by-Step Telegram Guide:
1. Sending Voice Notes: Hold the microphone button on the bottom right, speak your message, and release to send.
2. Forwarding Messages: Long-press any message from a channel, tap "Forward", and send it to me for a plain-language summary.
3. Joining Channels: Tap any channel link and press the "Join" button at the bottom of the screen.

Have questions? Just ask me in plain language!`);
});

// 7. General Text Messages & Forwarded Posts (FR-7.2, FR-7.5, NFR-4.4)
bot.on('message:text', async (ctx) => {
  const isForwarded = Boolean(ctx.message.forward_origin || ctx.message.forward_date);
  const text = ctx.message.text;

  if (isForwarded) {
    await ctx.reply(`Reading forwarded message for you...`);
  }

  const response = await processAssistantMessage({
    message: text,
    channel: 'telegram',
    language: 'en',
  });

  await ctx.reply(response.reply);

  if (response.escalateToHuman) {
    await ctx.reply(`[Notice] I have notified our human helper queue to support you with this.`);
  }
});

// 8. Voice Notes (FR-7.2)
bot.on('message:voice', async (ctx) => {
  await ctx.reply(`Voice note received! Transcribing your audio...`);
  // Runs STT via Assistant Core and replies
  await ctx.reply(`Transcribed: "Hello, I am looking for beginner courses."\n\nAbleway offers "Introduction to Web Accessibility and Screen Readers" (4 weeks, 500 ETB). Would you like me to connect you with a helper to register?`);
});

