import { helpRequests, profiles } from "@/lib/db/schema";
import { canViewHelpRequestContact } from "./policies";
import type { Actor } from "./roles";

/** Columns a help-request query selects. */
export const helpRequestColumns = {
  id: helpRequests.id,
  profileId: helpRequests.profileId,
  type: helpRequests.type,
  trigger: helpRequests.trigger,
  reason: helpRequests.reason,
  summary: helpRequests.summary,
  status: helpRequests.status,
  assignedHelperId: helpRequests.assignedHelperId,
  channel: helpRequests.channel,
  page: helpRequests.page,
  createdAt: helpRequests.createdAt,
  learnerName: profiles.name,
  learnerLanguage: profiles.language,
  learnerPhone: profiles.phone,
  learnerEmail: profiles.email,
};

type HelpRequestRow = {
  id: string;
  profileId: string | null;
  type: string;
  trigger: string;
  reason: string;
  summary: string | null;
  status: string;
  assignedHelperId: string | null;
  channel: string;
  page: string | null;
  createdAt: Date;
  learnerName: string | null;
  learnerLanguage: string | null;
  learnerPhone: string | null;
  learnerEmail: string | null;
};

/**
 * What an actor may see of a help request. Everyone allowed to view it sees
 * the request and the assistant's summary. Contact details appear only for
 * the assigned helper and admins (canViewHelpRequestContact).
 */
export function helpRequestView(actor: Actor, row: HelpRequestRow) {
  const { learnerPhone, learnerEmail, ...rest } = row;
  const contact = canViewHelpRequestContact(actor, row)
    ? { phone: learnerPhone, email: learnerEmail }
    : null;
  return { ...rest, contact };
}
