import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordAudit } from "@/lib/audit";
import * as s from "@/lib/db/schema";
import { currentConsents, hasConsent, recordConsent } from "@/lib/privacy/consent";
import { deleteAccount } from "@/lib/privacy/delete-account";
import { buildPersonalDataExport } from "@/lib/privacy/export";
import { runRetention } from "@/lib/privacy/retention";
import { retainVoiceRecording } from "@/lib/privacy/voice-recordings";
import { createTestDb, type TestDb } from "../db/test-db";

/**
 * SRS 6.4 privacy rules, run against a real Postgres (PGlite) with every
 * migration applied, so cascades, triggers and constraints are the real ones.
 */
let t: TestDb;
const DAY = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

let phone = 5550300;
async function learner(name = "Privacy Learner") {
  const [p] = await t.db
    .insert(s.profiles)
    .values({ name, role: "learner", phone: `+1555${phone++}` })
    .returning({ id: s.profiles.id });
  return p!;
}

const wav = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]);

describe("consent records", () => {
  it("is opt-in: no record means not given", async () => {
    const p = await learner();
    expect(await hasConsent(t.db, p.id, "voice_retention")).toBe(false);
    const all = await currentConsents(t.db, p.id);
    expect(all.every((c) => c.granted === false)).toBe(true);
  });

  it("keeps the full history and uses the newest choice", async () => {
    const p = await learner();
    await recordConsent(t.db, {
      profileId: p.id,
      purpose: "job_alerts",
      granted: true,
      source: "web",
    });
    await recordConsent(t.db, {
      profileId: p.id,
      purpose: "job_alerts",
      granted: false,
      source: "web",
    });
    expect(await hasConsent(t.db, p.id, "job_alerts")).toBe(false);
    const rows = await t.db
      .select()
      .from(s.consentRecords)
      .where(eq(s.consentRecords.profileId, p.id));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.policyVersion.length > 0)).toBe(true);
  });

  it("writes an audit row for each change, without personal text", async () => {
    const p = await learner();
    await recordConsent(t.db, {
      profileId: p.id,
      purpose: "voice_retention",
      granted: true,
      source: "web",
    });
    const [row] = await t.db
      .select()
      .from(s.auditLog)
      .where(eq(s.auditLog.target, `profiles:${p.id}`));
    expect(row?.action).toBe("consent.changed");
    expect(row?.metadata).toEqual({ purpose: "voice_retention", granted: true, source: "web" });
  });
});

describe("voice recordings", () => {
  it("are not stored by default (operator switch off)", async () => {
    const p = await learner();
    await recordConsent(t.db, {
      profileId: p.id,
      purpose: "voice_retention",
      granted: true,
      source: "web",
    });
    expect(
      await retainVoiceRecording(t.db, { enabled: false, days: 30 }, wav, { profileId: p.id }),
    ).toBe(false);
  });

  it("are not stored without the learner's opt-in, even when the switch is on", async () => {
    const p = await learner();
    expect(
      await retainVoiceRecording(t.db, { enabled: true, days: 30 }, wav, { profileId: p.id }),
    ).toBe(false);
    expect(
      await retainVoiceRecording(t.db, { enabled: true, days: 30 }, wav, { profileId: null }),
    ).toBe(false);
  });

  it("are stored with an expiry when both the switch and opt-in are on", async () => {
    const p = await learner();
    await recordConsent(t.db, {
      profileId: p.id,
      purpose: "voice_retention",
      granted: true,
      source: "web",
    });
    const now = new Date("2026-11-14T10:00:00Z");
    expect(
      await retainVoiceRecording(t.db, { enabled: true, days: 7 }, wav, { profileId: p.id }, now),
    ).toBe(true);
    const [row] = await t.db
      .select()
      .from(s.voiceRecordings)
      .where(eq(s.voiceRecordings.profileId, p.id));
    expect(row?.expiresAt.toISOString()).toBe("2026-11-21T10:00:00.000Z");
  });

  it("are deleted at once when the learner withdraws consent", async () => {
    const p = await learner();
    await recordConsent(t.db, {
      profileId: p.id,
      purpose: "voice_retention",
      granted: true,
      source: "web",
    });
    await retainVoiceRecording(t.db, { enabled: true, days: 30 }, wav, { profileId: p.id });
    await recordConsent(t.db, {
      profileId: p.id,
      purpose: "voice_retention",
      granted: false,
      source: "web",
    });
    const rows = await t.db
      .select()
      .from(s.voiceRecordings)
      .where(eq(s.voiceRecordings.profileId, p.id));
    expect(rows).toHaveLength(0);
  });
});

async function richLearner() {
  const p = await learner("Rich Learner");
  const [course] = await t.db
    .insert(s.courses)
    .values({
      slug: `c-${p.id.slice(0, 8)}`,
      title: "Export Course",
      description: "d",
      currency: "ETB",
      priceMinor: 50000,
      status: "published",
    })
    .returning();
  const [enrollment] = await t.db
    .insert(s.enrollments)
    .values({ profileId: p.id, courseId: course!.id, status: "active" })
    .returning();
  await t.db.insert(s.paymentRecords).values({
    enrollmentId: enrollment!.id,
    amountMinor: 50000,
    currency: "ETB",
    method: "mobile_money",
  });
  const [conv] = await t.db
    .insert(s.conversations)
    .values({ profileId: p.id, channel: "telegram" })
    .returning();
  await t.db
    .insert(s.messages)
    .values({ conversationId: conv!.id, role: "learner", content: "Where is my course?" });
  await t.db.insert(s.telegramLinks).values({
    profileId: p.id,
    telegramId: 700000 + phone,
    consentAt: new Date(),
  });
  const [sub] = await t.db
    .insert(s.alertSubscriptions)
    .values({ profileId: p.id, keywords: ["tester"] })
    .returning();
  await t.db.insert(s.helpRequests).values({
    profileId: p.id,
    type: "payment",
    trigger: "learner",
    reason: "Help me pay",
    channel: "web",
  });
  await t.db
    .insert(s.passwordCredentials)
    .values({ profileId: p.id, passwordHash: "scrypt$secret$hash" });
  await recordConsent(t.db, {
    profileId: p.id,
    purpose: "voice_retention",
    granted: true,
    source: "web",
  });
  await retainVoiceRecording(t.db, { enabled: true, days: 30 }, wav, { profileId: p.id });
  return { p, enrollment: enrollment!, conv: conv!, sub: sub! };
}

describe("data export (JSON)", () => {
  it("contains everything held about the learner, and no secrets", async () => {
    const { p } = await richLearner();
    const data = await buildPersonalDataExport(t.db, p.id);
    expect(data.format).toBe("ableway-personal-data");
    expect(data.profile.id).toBe(p.id);
    expect(data.enrollments[0]?.payments[0]?.amountMinor).toBe(50000);
    expect(data.conversations[0]?.messages[0]?.content).toBe("Where is my course?");
    expect(data.telegram?.telegramId).toBeGreaterThan(0);
    expect(data.jobAlerts[0]?.keywords).toEqual(["tester"]);
    expect(data.helpRequests[0]?.reason).toBe("Help me pay");
    expect(data.consents.some((c) => c.purpose === "voice_retention" && c.granted)).toBe(true);
    expect(data.voiceRecordings.items).toHaveLength(1);
    expect(data.signIn.hasPassword).toBe(true);

    const text = JSON.stringify(data);
    expect(text).not.toContain("scrypt$");
    expect(text).not.toContain('"audio"');
    // It is valid, round-trippable JSON.
    expect(JSON.parse(text).profile.id).toBe(p.id);
  });
});

describe("account deletion", () => {
  it("removes conversations, Telegram links, subscriptions and all personal data", async () => {
    const { p, enrollment, conv, sub } = await richLearner();
    const summary = await deleteAccount(t.db, p.id, p.id);
    expect(summary).toMatchObject({
      conversations: 1,
      telegramLinks: 1,
      subscriptions: 1,
      helpRequests: 1,
      enrollments: 1,
      voiceRecordings: 1,
    });

    const count = async (
      table: typeof s.profiles | typeof s.conversations,
      where: ReturnType<typeof eq>,
    ) => (await t.db.select().from(table).where(where)).length;
    expect(await count(s.profiles, eq(s.profiles.id, p.id))).toBe(0);
    expect(await count(s.conversations, eq(s.conversations.id, conv.id))).toBe(0);
    expect(
      (await t.db.select().from(s.messages).where(eq(s.messages.conversationId, conv.id))).length,
    ).toBe(0);
    expect(
      (await t.db.select().from(s.telegramLinks).where(eq(s.telegramLinks.profileId, p.id))).length,
    ).toBe(0);
    expect(
      (await t.db.select().from(s.alertSubscriptions).where(eq(s.alertSubscriptions.id, sub.id)))
        .length,
    ).toBe(0);
    expect(
      (await t.db.select().from(s.consentRecords).where(eq(s.consentRecords.profileId, p.id)))
        .length,
    ).toBe(0);
    expect(
      (await t.db.select().from(s.voiceRecordings).where(eq(s.voiceRecordings.profileId, p.id)))
        .length,
    ).toBe(0);
    expect(
      (
        await t.db
          .select()
          .from(s.passwordCredentials)
          .where(eq(s.passwordCredentials.profileId, p.id))
      ).length,
    ).toBe(0);
    expect(
      (await t.db.select().from(s.helpRequests).where(eq(s.helpRequests.profileId, p.id))).length,
    ).toBe(0);

    // The payment stays as an anonymous financial record.
    const payments = await t.db
      .select()
      .from(s.paymentRecords)
      .where(eq(s.paymentRecords.amountMinor, 50000));
    expect(payments.some((row) => row.enrollmentId === null)).toBe(true);
    expect(payments.some((row) => row.enrollmentId === enrollment.id)).toBe(false);

    // The deletion itself is audited, with counts only.
    const [audit] = await t.db
      .select()
      .from(s.auditLog)
      .where(
        sql`${s.auditLog.action} = 'account.deleted' and ${s.auditLog.target} = ${`profiles:${p.id}`}`,
      );
    expect(audit?.metadata).toMatchObject({ selfService: true, conversations: 1 });
    expect(JSON.stringify(audit?.metadata)).not.toContain("Rich Learner");
  });
});

describe("retention job", () => {
  it("deletes old conversations and expired audio, and keeps recent ones", async () => {
    const p = await learner();
    const now = new Date("2026-11-14T00:00:00Z");
    const old = new Date(now.getTime() - 120 * DAY);
    const recent = new Date(now.getTime() - 5 * DAY);

    const [oldConv] = await t.db
      .insert(s.conversations)
      .values({ profileId: p.id, channel: "web", createdAt: old })
      .returning();
    await t.db
      .insert(s.messages)
      .values({ conversationId: oldConv!.id, role: "learner", content: "old", createdAt: old });

    // Started long ago, but still active: kept.
    const [activeConv] = await t.db
      .insert(s.conversations)
      .values({ profileId: p.id, channel: "web", createdAt: old })
      .returning();
    await t.db.insert(s.messages).values({
      conversationId: activeConv!.id,
      role: "learner",
      content: "new",
      createdAt: recent,
    });

    // Unlinked Telegram conversation (no profile): also subject to retention.
    const [anonConv] = await t.db
      .insert(s.conversations)
      .values({ profileId: null, channel: "telegram", createdAt: old })
      .returning();

    await t.db.insert(s.voiceRecordings).values([
      { profileId: p.id, audio: wav, expiresAt: new Date(now.getTime() - DAY) },
      { profileId: p.id, audio: wav, expiresAt: new Date(now.getTime() + DAY) },
    ]);

    const result = await runRetention(t.db, { conversationDays: 90 }, now);
    expect(result.conversations).toBeGreaterThanOrEqual(2);
    expect(result.voiceRecordings).toBe(1);

    const remaining = await t.db.select({ id: s.conversations.id }).from(s.conversations);
    const ids = remaining.map((r) => r.id);
    expect(ids).not.toContain(oldConv!.id);
    expect(ids).not.toContain(anonConv!.id);
    expect(ids).toContain(activeConv!.id);
    const audio = await t.db
      .select()
      .from(s.voiceRecordings)
      .where(eq(s.voiceRecordings.profileId, p.id));
    expect(audio).toHaveLength(1);

    const [audit] = await t.db
      .select()
      .from(s.auditLog)
      .where(eq(s.auditLog.action, "retention.purged"));
    expect(audit?.actorId).toBeNull();
  });

  it("can run twice without error", async () => {
    await runRetention(t.db, { conversationDays: 90 });
    await expect(runRetention(t.db, { conversationDays: 90 })).resolves.toBeDefined();
  });
});

describe("audit log", () => {
  it("is append-only in the database", async () => {
    await recordAudit(t.db, {
      actorId: null,
      action: "retention.purged",
      target: "test:append-only",
    });
    await expect(
      t.db
        .update(s.auditLog)
        .set({ action: "tampered" })
        .where(eq(s.auditLog.target, "test:append-only")),
    ).rejects.toThrow();
    await expect(
      t.db.delete(s.auditLog).where(eq(s.auditLog.target, "test:append-only")),
    ).rejects.toThrow();
  });

  it("refuses personal free text in metadata", async () => {
    await expect(
      recordAudit(t.db, {
        actorId: null,
        action: "help_request.closed",
        target: "help_requests:x",
        metadata: { notes: "Called Abebe on +251911234567" },
      }),
    ).rejects.toThrow(/personal free text/);
  });
});
