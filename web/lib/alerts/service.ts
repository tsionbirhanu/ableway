import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/types";
import {
  alertCronState,
  alertDeliveries,
  alertSubscriptions,
  jobs,
  profiles,
  telegramLinks,
} from "@/lib/db/schema";
import { matchesSubscription } from "@/lib/jobs/service";
import type { AlertSender } from "./senders";

const MAX_ATTEMPTS = 3;
export async function runAlertBatch(
  db: Db,
  senders: Record<"telegram" | "sms", AlertSender>,
  now = new Date(),
) {
  const [cursor] = await db
    .select()
    .from(alertCronState)
    .where(eq(alertCronState.key, "job-alerts"));
  const since = cursor?.lastRunAt ?? new Date(0);
  const newJobs = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "published"),
        eq(jobs.suspicious, false),
        gt(jobs.publishedAt, since),
        lt(jobs.publishedAt, now),
      ),
    );
  const subscriptions = await db
    .select()
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.active, true));
  let sent = 0,
    failed = 0,
    skipped = 0;
  for (const job of newJobs)
    for (const sub of subscriptions) {
      if (!matchesSubscription(job, sub)) continue;
      await db
        .insert(alertDeliveries)
        .values({ subscriptionId: sub.id, jobId: job.id, channel: sub.channel })
        .onConflictDoNothing();
      const [delivery] = await db
        .select()
        .from(alertDeliveries)
        .where(and(eq(alertDeliveries.subscriptionId, sub.id), eq(alertDeliveries.jobId, job.id)));
      if (
        !delivery ||
        delivery.status === "sent" ||
        delivery.status === "skipped" ||
        delivery.attempts >= MAX_ATTEMPTS
      ) {
        skipped++;
        continue;
      }
      const [profile] = await db
        .select({ phone: profiles.phone })
        .from(profiles)
        .where(eq(profiles.id, sub.profileId));
      let recipient: string | undefined;
      if (sub.channel === "telegram") {
        const [link] = await db
          .select({ telegramId: telegramLinks.telegramId })
          .from(telegramLinks)
          .where(eq(telegramLinks.profileId, sub.profileId));
        recipient = link?.telegramId.toString();
      } else recipient = profile?.phone ?? undefined;
      if (!recipient) {
        await db
          .update(alertDeliveries)
          .set({ status: "skipped" })
          .where(eq(alertDeliveries.id, delivery.id));
        skipped++;
        continue;
      }
      await db
        .update(alertDeliveries)
        .set({ attempts: sql`${alertDeliveries.attempts} + 1` })
        .where(eq(alertDeliveries.id, delivery.id));
      try {
        await senders[sub.channel].send({
          channel: sub.channel,
          recipient,
          text: `${job.title} at ${job.employer}, ${job.location}. Apply: ${job.howToApply}`,
        });
        await db
          .update(alertDeliveries)
          .set({ status: "sent", sentAt: now })
          .where(eq(alertDeliveries.id, delivery.id));
        sent++;
      } catch {
        await db
          .update(alertDeliveries)
          .set({ status: delivery.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending" })
          .where(eq(alertDeliveries.id, delivery.id));
        failed++;
      }
    }
  // Keep the cursor behind failed sends so a later cron invocation retries
  // their pending delivery rows up to MAX_ATTEMPTS before moving on.
  if (failed === 0) {
    await db
      .insert(alertCronState)
      .values({ key: "job-alerts", lastRunAt: now })
      .onConflictDoUpdate({ target: alertCronState.key, set: { lastRunAt: now } });
  }
  return { jobs: newJobs.length, sent, failed, skipped };
}
