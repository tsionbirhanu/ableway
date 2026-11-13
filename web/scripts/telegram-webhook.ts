import { parseEnv } from "../lib/env";

/**
 * Helper to manage Telegram Bot Webhook in development (e.g. through a Cloudflare or ngrok tunnel).
 *
 * Usage:
 *   pnpm tsx --conditions=react-server scripts/telegram-webhook.ts set <tunnel-url>
 *   pnpm tsx --conditions=react-server scripts/telegram-webhook.ts get
 *   pnpm tsx --conditions=react-server scripts/telegram-webhook.ts delete
 */
async function main() {
  const env = parseEnv(process.env);
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not set in environment.");
    process.exit(1);
  }

  const action = process.argv[2] || "get";
  const apiUrl = `https://api.telegram.org/bot${token}`;

  if (action === "set") {
    let tunnelUrl = process.argv[3];
    if (!tunnelUrl) {
      console.error("Please provide the tunnel URL, for example: https://abc.trycloudflare.com");
      process.exit(1);
    }

    tunnelUrl = tunnelUrl.replace(/\/+$/, "");
    const webhookUrl = `${tunnelUrl}/api/telegram`;

    console.log(`Setting webhook to: ${webhookUrl}`);
    const res = await fetch(`${apiUrl}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message", "edited_message", "callback_query"],
      }),
    });

    const data = await res.json();
    console.log("Telegram setWebhook response:", JSON.stringify(data, null, 2));
    if (!data.ok) {
      process.exit(1);
    }
  } else if (action === "delete") {
    console.log("Deleting webhook...");
    const res = await fetch(`${apiUrl}/deleteWebhook`);
    const data = await res.json();
    console.log("Telegram deleteWebhook response:", JSON.stringify(data, null, 2));
  } else {
    // "get"
    console.log("Fetching webhook info...");
    const res = await fetch(`${apiUrl}/getWebhookInfo`);
    const data = await res.json();
    console.log("Telegram getWebhookInfo response:", JSON.stringify(data, null, 2));
  }
}

main().catch((err) => {
  console.error("Error managing Telegram webhook:", err);
  process.exit(1);
});
