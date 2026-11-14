import { asc, eq, inArray } from "drizzle-orm";
import {
  alertDeliveries,
  alertSubscriptions,
  consentRecords,
  conversations,
  courses,
  enrollments,
  helpRequests,
  linkCodes,
  messages,
  passkeyCredentials,
  passwordCredentials,
  paymentRecords,
  profiles,
  telegramLinks,
  voiceRecordings,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { NotFoundError } from "@/lib/auth/errors";

/**
 * Everything we hold about one learner, as JSON (the right of access and
 * data portability). Secrets are described, never included: no password
 * hash, no passkey public key, no link-code hash. Voice recordings are
 * listed with their dates; the audio itself is not put in the file.
 */
export const EXPORT_FORMAT_VERSION = 1;

export async function buildPersonalDataExport(db: Db, profileId: string, now: Date = new Date()) {
  const [profile] = await db
    .select({
      id: profiles.id,
      name: profiles.name,
      email: profiles.email,
      phone: profiles.phone,
      language: profiles.language,
      role: profiles.role,
      accessibility: profiles.accessibility,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .where(eq(profiles.id, profileId));
  if (!profile) throw new NotFoundError();

  const [password] = await db
    .select({ createdAt: passwordCredentials.createdAt })
    .from(passwordCredentials)
    .where(eq(passwordCredentials.profileId, profileId));

  const passkeys = await db
    .select({
      deviceType: passkeyCredentials.deviceType,
      backedUp: passkeyCredentials.backedUp,
      createdAt: passkeyCredentials.createdAt,
      lastUsedAt: passkeyCredentials.lastUsedAt,
    })
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.profileId, profileId));

  const enrollmentRows = await db
    .select({
      id: enrollments.id,
      course: courses.title,
      status: enrollments.status,
      progress: enrollments.progress,
      lastPosition: enrollments.lastPosition,
      createdAt: enrollments.createdAt,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(eq(enrollments.profileId, profileId))
    .orderBy(asc(enrollments.createdAt));

  const enrollmentIds = enrollmentRows.map((e) => e.id);
  const payments = enrollmentIds.length
    ? await db
        .select({
          enrollmentId: paymentRecords.enrollmentId,
          amountMinor: paymentRecords.amountMinor,
          currency: paymentRecords.currency,
          method: paymentRecords.method,
          confirmedAt: paymentRecords.confirmedAt,
        })
        .from(paymentRecords)
        .where(inArray(paymentRecords.enrollmentId, enrollmentIds))
    : [];

  const help = await db
    .select({
      id: helpRequests.id,
      type: helpRequests.type,
      trigger: helpRequests.trigger,
      reason: helpRequests.reason,
      summary: helpRequests.summary,
      status: helpRequests.status,
      channel: helpRequests.channel,
      page: helpRequests.page,
      createdAt: helpRequests.createdAt,
    })
    .from(helpRequests)
    .where(eq(helpRequests.profileId, profileId))
    .orderBy(asc(helpRequests.createdAt));

  const conversationRows = await db
    .select({
      id: conversations.id,
      channel: conversations.channel,
      language: conversations.language,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(eq(conversations.profileId, profileId))
    .orderBy(asc(conversations.createdAt));
  const messageRows = conversationRows.length
    ? await db
        .select({
          conversationId: messages.conversationId,
          role: messages.role,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(
          inArray(
            messages.conversationId,
            conversationRows.map((c) => c.id),
          ),
        )
        .orderBy(asc(messages.createdAt))
    : [];

  const [telegram] = await db
    .select({
      telegramId: telegramLinks.telegramId,
      language: telegramLinks.language,
      consentAt: telegramLinks.consentAt,
      linkedAt: telegramLinks.createdAt,
    })
    .from(telegramLinks)
    .where(eq(telegramLinks.profileId, profileId));

  const subscriptions = await db
    .select({
      id: alertSubscriptions.id,
      keywords: alertSubscriptions.keywords,
      location: alertSubscriptions.location,
      jobType: alertSubscriptions.jobType,
      channel: alertSubscriptions.channel,
      active: alertSubscriptions.active,
      createdAt: alertSubscriptions.createdAt,
    })
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.profileId, profileId));
  const deliveries = subscriptions.length
    ? await db
        .select({
          subscriptionId: alertDeliveries.subscriptionId,
          jobId: alertDeliveries.jobId,
          channel: alertDeliveries.channel,
          status: alertDeliveries.status,
          sentAt: alertDeliveries.sentAt,
        })
        .from(alertDeliveries)
        .where(
          inArray(
            alertDeliveries.subscriptionId,
            subscriptions.map((s) => s.id),
          ),
        )
    : [];

  const consents = await db
    .select({
      purpose: consentRecords.purpose,
      granted: consentRecords.granted,
      policyVersion: consentRecords.policyVersion,
      source: consentRecords.source,
      at: consentRecords.createdAt,
    })
    .from(consentRecords)
    .where(eq(consentRecords.profileId, profileId))
    .orderBy(asc(consentRecords.createdAt));

  const recordings = await db
    .select({
      createdAt: voiceRecordings.createdAt,
      expiresAt: voiceRecordings.expiresAt,
      contentType: voiceRecordings.contentType,
    })
    .from(voiceRecordings)
    .where(eq(voiceRecordings.profileId, profileId));

  const pendingLinkCodes = await db
    .select({ createdAt: linkCodes.createdAt, expiresAt: linkCodes.expiresAt })
    .from(linkCodes)
    .where(eq(linkCodes.profileId, profileId));

  return {
    format: "ableway-personal-data",
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    profile,
    signIn: {
      hasPassword: Boolean(password),
      passwordSetAt: password?.createdAt ?? null,
      passkeys,
    },
    enrollments: enrollmentRows.map((e) => ({
      ...e,
      payments: payments.filter((p) => p.enrollmentId === e.id),
    })),
    helpRequests: help,
    conversations: conversationRows.map((c) => ({
      ...c,
      messages: messageRows.filter((m) => m.conversationId === c.id),
    })),
    telegram: telegram ?? null,
    telegramLinkCodes: pendingLinkCodes,
    jobAlerts: subscriptions.map((s) => ({
      ...s,
      deliveries: deliveries.filter((d) => d.subscriptionId === s.id),
    })),
    consents,
    voiceRecordings: {
      note: "Audio files are not included. Ask a helper if you need a copy.",
      items: recordings,
    },
  };
}

export type PersonalDataExport = Awaited<ReturnType<typeof buildPersonalDataExport>>;
