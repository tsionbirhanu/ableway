import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db/test-db";
import { alertDeliveries, alertSubscriptions, jobs, profiles, telegramLinks } from "@/lib/db/schema";
import { matchesSubscription, reviewReason } from "@/lib/jobs/service";
import { runAlertBatch } from "@/lib/alerts/service";

describe("jobs and alert delivery", () => {
  it("matches keyword, location, and job type filters", () => {
    const job = { title: "Accessibility tester", employer: "Able", location: "Addis Ababa", jobType: "internship" as const, description: "Screen reader testing", requirements: "NVDA" };
    expect(matchesSubscription(job, { keywords: ["screen reader"], location: "addis", jobType: "internship" })).toBe(true);
    expect(matchesSubscription(job, { keywords: ["designer"], location: "addis", jobType: "internship" })).toBe(false);
  });

  it("flags money requests and missing employers", () => {
    const post = { title: "Test", employer: "", location: "Addis", jobType: "full_time" as const, description: "", requirements: "", howToApply: "Pay a registration fee" };
    expect(reviewReason(post)).toBe("Requests money from applicants");
    expect(reviewReason({ ...post, howToApply: "Email your CV" })).toBe("Employer is missing");
  });

  it("sends Telegram with an injected mock and does not duplicate on rerun", async () => {
    const { db, client } = await createTestDb();
    try {
      const [profile] = await db.insert(profiles).values({ name: "Learner" }).returning();
      await db.insert(telegramLinks).values({ profileId: profile.id, telegramId: 123456, consentAt: new Date() });
      const [sub] = await db.insert(alertSubscriptions).values({ profileId: profile.id, keywords: ["analyst"] }).returning();
      const [job] = await db.insert(jobs).values({ title: "Data analyst", employer: "Able", location: "Addis", jobType: "full_time", requirements: "SQL", howToApply: "Apply online", status: "published", publishedAt: new Date(Date.now() - 1000) }).returning();
      const send = vi.fn().mockResolvedValue(undefined);
      const senders = { telegram: { send }, sms: { send: vi.fn() } };
      expect((await runAlertBatch(db as never, senders)).sent).toBe(1);
      expect((await runAlertBatch(db as never, senders)).sent).toBe(0);
      expect(send).toHaveBeenCalledOnce();
      expect(await db.select().from(alertDeliveries).where(eq(alertDeliveries.subscriptionId, sub.id))).toHaveLength(1);
      expect(send.mock.calls[0][0]).toMatchObject({ channel: "telegram", recipient: "123456" });
      void job;
    } finally { await client.close(); }
  });
});
