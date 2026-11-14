import { auditMetadataSchema, type AuditMetadata } from "@/lib/db/json-types";
import { auditLog } from "@/lib/db/schema";
import type { Db, Tx } from "@/lib/db/types";

/**
 * Audit log for security-relevant actions.
 *
 * Rows are append-only (a database trigger refuses updates and deletes; see
 * drizzle/0008_privacy_consent_retention.sql). Metadata holds ids, counts and
 * enum values only: never names, contact details, free text, or message
 * content, because audit rows outlive account deletion.
 *
 * Call this inside the same transaction as the change it records, so a
 * change is never made without its audit row.
 */
export const auditActions = [
  "payment.confirmed",
  "role.changed",
  "knowledge.created",
  "knowledge.updated",
  "knowledge.unpublished",
  "knowledge.deleted",
  "unanswered.deleted",
  "subscription.deleted",
  "telegram.unlinked",
  "account.deleted",
  "consent.changed",
  "data.exported",
  "retention.purged",
  "help_request.closed",
  "help_request.transferred",
] as const;
export type AuditAction = (typeof auditActions)[number];

/** Free-text fields that must never be written to audit metadata. */
const FORBIDDEN_KEYS =
  /^(e-?mail|phone|name|text|content|message|notes?|reason|summary|transcript)$/i;

export type AuditEntry = {
  /** Null when the system acted (cron jobs). */
  actorId: string | null;
  action: AuditAction;
  /** "table:id", for example "enrollments:5f0c...". */
  target: string;
  metadata?: AuditMetadata;
};

export async function recordAudit(db: Db | Tx, entry: AuditEntry): Promise<void> {
  const metadata = auditMetadataSchema.parse(entry.metadata ?? {});
  const forbidden = Object.keys(metadata).filter((key) => FORBIDDEN_KEYS.test(key));
  if (forbidden.length > 0) {
    throw new Error(`Audit metadata must not contain personal free text: ${forbidden.join(", ")}`);
  }
  await db.insert(auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    target: entry.target,
    metadata,
  });
}
