import "server-only";
import { requireFeatureKey, getEnv } from "@/lib/env";

export type AlertMessage = { channel: "telegram" | "sms"; recipient: string; text: string };
export type AlertSender = { send(message: AlertMessage): Promise<void> };

export const telegramSender: AlertSender = {
  async send({ recipient, text }) {
    const token = requireFeatureKey("TELEGRAM_BOT_TOKEN");
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: recipient, text }),
    });
    if (!response.ok) throw new Error("Telegram delivery failed");
  },
};

/** Provider adapter point. Disabled by default until an SMS gateway is configured. */
export const smsSender: AlertSender = {
  async send() {
    if (!getEnv().SMS_ENABLED) throw new Error("SMS delivery is disabled");
    throw new Error("SMS provider is not configured");
  },
};
