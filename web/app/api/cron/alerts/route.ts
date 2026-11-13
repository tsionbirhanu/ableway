import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { telegramSender, smsSender } from "@/lib/alerts/senders";
import { runAlertBatch } from "@/lib/alerts/service";

export async function GET(request: Request) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = getEnv().CRON_SECRET;
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await runAlertBatch(getDb(), { telegram: telegramSender, sms: smsSender }));
  } catch {
    return Response.json({ error: "Alert run failed" }, { status: 500 });
  }
}
