import { withApi } from "@/lib/api/handler";
import { requireCronSecret } from "@/lib/api/secrets";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/log";
import { runRetention } from "@/lib/privacy/retention";

/**
 * Retention job. Vercel Cron calls this daily with the CRON_SECRET bearer
 * token. Deletes conversations older than CONVERSATION_RETENTION_DAYS,
 * expired voice recordings, and other expired data (lib/privacy/retention.ts).
 */
export const GET = withApi({ rateLimit: "cron", csrf: false }, async (request: Request) => {
  requireCronSecret(request);
  const env = getEnv();
  try {
    const result = await runRetention(getDb(), {
      conversationDays: env.CONVERSATION_RETENTION_DAYS,
    });
    logger.info("cron.retention.done", { result });
    return Response.json({ ok: true, deleted: result });
  } catch (error) {
    logger.error("cron.retention.failed", { error });
    return Response.json({ error: "Retention run failed" }, { status: 500 });
  }
});
