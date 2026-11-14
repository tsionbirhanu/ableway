import { telegramSender, smsSender } from "@/lib/alerts/senders";
import { runAlertBatch } from "@/lib/alerts/service";
import { withApi } from "@/lib/api/handler";
import { requireCronSecret } from "@/lib/api/secrets";
import { getDb } from "@/lib/db/client";
import { logger } from "@/lib/log";

/** Job alerts. Vercel Cron calls this every 15 minutes with the CRON_SECRET bearer token. */
export const GET = withApi({ rateLimit: "cron", csrf: false }, async (request: Request) => {
  requireCronSecret(request);
  try {
    const result = await runAlertBatch(getDb(), { telegram: telegramSender, sms: smsSender });
    logger.info("cron.alerts.done", { result });
    return Response.json(result);
  } catch (error) {
    logger.error("cron.alerts.failed", { error });
    return Response.json({ error: "Alert run failed" }, { status: 500 });
  }
});
