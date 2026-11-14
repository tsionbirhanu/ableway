import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { consentPurpose, consentRecords, consentSource, voiceRecordings } from "@/lib/db/schema";
import type { Db, Tx } from "@/lib/db/types";

/**
 * Consent records. Every change is a new row (see schema.ts), so the full
 * history is kept for as long as the account exists. The current state for
 * a purpose is its newest row. No row means "not given": every purpose is
 * opt-in.
 */

/** Bump when the wording on the profile page changes, so old consents can be re-asked. */
export const CURRENT_POLICY_VERSION = "2026-11";

export const consentPurposes = consentPurpose.enumValues;
export type ConsentPurpose = (typeof consentPurposes)[number];
export type ConsentSource = (typeof consentSource.enumValues)[number];

export const consentChangeInput = z.strictObject({
  purpose: z.enum(consentPurposes),
  granted: z.boolean(),
});

export type ConsentState = {
  purpose: ConsentPurpose;
  granted: boolean;
  policyVersion: string | null;
  changedAt: Date | null;
};

export async function recordConsent(
  db: Db,
  input: {
    profileId: string;
    purpose: ConsentPurpose;
    granted: boolean;
    source: ConsentSource;
    actorId?: string | null;
  },
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(consentRecords).values({
      profileId: input.profileId,
      purpose: input.purpose,
      granted: input.granted,
      policyVersion: CURRENT_POLICY_VERSION,
      source: input.source,
    });
    // Withdrawing voice consent deletes the recordings already kept, at once.
    if (input.purpose === "voice_retention" && !input.granted) {
      await tx.delete(voiceRecordings).where(eq(voiceRecordings.profileId, input.profileId));
    }
    await recordAudit(tx, {
      actorId: input.actorId ?? input.profileId,
      action: "consent.changed",
      target: `profiles:${input.profileId}`,
      metadata: { purpose: input.purpose, granted: input.granted, source: input.source },
    });
  });
}

export async function hasConsent(
  db: Db | Tx,
  profileId: string,
  purpose: ConsentPurpose,
): Promise<boolean> {
  const [latest] = await db
    .select({ granted: consentRecords.granted })
    .from(consentRecords)
    .where(and(eq(consentRecords.profileId, profileId), eq(consentRecords.purpose, purpose)))
    .orderBy(desc(consentRecords.createdAt), desc(consentRecords.id))
    .limit(1);
  return latest?.granted ?? false;
}

/** Current state of every purpose, for the profile page. */
export async function currentConsents(db: Db, profileId: string): Promise<ConsentState[]> {
  const rows = await db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.profileId, profileId))
    .orderBy(desc(consentRecords.createdAt), desc(consentRecords.id));
  return consentPurposes.map((purpose) => {
    const latest = rows.find((row) => row.purpose === purpose);
    return {
      purpose,
      granted: latest?.granted ?? false,
      policyVersion: latest?.policyVersion ?? null,
      changedAt: latest?.createdAt ?? null,
    };
  });
}
