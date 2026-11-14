import { eq, inArray } from "drizzle-orm";
import { recordAudit } from "@/lib/audit";
import {
  alertSubscriptions,
  conversations,
  enrollments,
  helpRequests,
  linkCodes,
  profiles,
  telegramLinks,
  voiceRecordings,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { NotFoundError } from "@/lib/auth/errors";

/**
 * Permanently delete a learner's account and personal data, in one transaction.
 *
 * Deleted: profile, sign-in credentials, enrollments, conversations and
 * messages, Telegram link and link codes, job alert subscriptions and their
 * deliveries, consent records, voice recordings, and the learner's own help
 * requests (their reason and summary are personal).
 *
 * Kept, with no link to the person: payment records (amount, currency,
 * method, date) for bookkeeping, and audit rows (actor_id is cleared by the
 * database). One audit row records the deletion itself, with counts only.
 *
 * Most rows go by ON DELETE CASCADE from profiles. Conversations, Telegram
 * links and subscriptions are also deleted explicitly, so the counts are
 * exact and the rule does not depend on a foreign key staying as it is.
 */
export type DeletionSummary = {
  conversations: number;
  telegramLinks: number;
  subscriptions: number;
  helpRequests: number;
  enrollments: number;
  voiceRecordings: number;
};

export async function deleteAccount(
  db: Db,
  profileId: string,
  actorId: string,
): Promise<DeletionSummary> {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .for("update");
    if (!profile) throw new NotFoundError();

    const deletedConversations = await tx
      .delete(conversations)
      .where(eq(conversations.profileId, profileId))
      .returning({ id: conversations.id });
    const deletedLinks = await tx
      .delete(telegramLinks)
      .where(eq(telegramLinks.profileId, profileId))
      .returning({ id: telegramLinks.id });
    await tx.delete(linkCodes).where(eq(linkCodes.profileId, profileId));
    const deletedSubscriptions = await tx
      .delete(alertSubscriptions)
      .where(eq(alertSubscriptions.profileId, profileId))
      .returning({ id: alertSubscriptions.id });
    const deletedHelp = await tx
      .delete(helpRequests)
      .where(eq(helpRequests.profileId, profileId))
      .returning({ id: helpRequests.id });
    const deletedRecordings = await tx
      .delete(voiceRecordings)
      .where(eq(voiceRecordings.profileId, profileId))
      .returning({ id: voiceRecordings.id });
    const learnerEnrollments = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(eq(enrollments.profileId, profileId));
    if (learnerEnrollments.length > 0) {
      // payment_records.enrollment_id becomes NULL (ON DELETE SET NULL).
      await tx.delete(enrollments).where(
        inArray(
          enrollments.id,
          learnerEnrollments.map((e) => e.id),
        ),
      );
    }

    // Cascades: password and passkey credentials, consent records.
    await tx.delete(profiles).where(eq(profiles.id, profileId));

    const summary: DeletionSummary = {
      conversations: deletedConversations.length,
      telegramLinks: deletedLinks.length,
      subscriptions: deletedSubscriptions.length,
      helpRequests: deletedHelp.length,
      enrollments: learnerEnrollments.length,
      voiceRecordings: deletedRecordings.length,
    };
    await recordAudit(tx, {
      // The actor is the learner themselves (now deleted) or an admin.
      actorId: actorId === profileId ? null : actorId,
      action: "account.deleted",
      target: `profiles:${profileId}`,
      metadata: { selfService: actorId === profileId, ...summary },
    });
    return summary;
  });
}
