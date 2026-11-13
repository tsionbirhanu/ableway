import "server-only";
import { z } from "zod";
import { canCreateHelpRequest } from "@/lib/auth/policies";
import { enforce, hashKeyPart, LIMITS } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/request-ip";
import { authorize, getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { helpChannel, helpRequests, helpRequestType } from "@/lib/db/schema";

export const helpRequestInput = z.strictObject({
  type: z.enum(helpRequestType.enumValues).default("general"),
  reason: z.string().trim().min(1).max(500),
  channel: z.enum(helpChannel.enumValues).default("web"),
  page: z.string().trim().max(300).startsWith("/").optional(),
});

export type HelpRequestInput = z.infer<typeof helpRequestInput>;

/**
 * Save a help request from a learner (signed in or not).
 * Shared by POST /api/help-requests and the older POST /api/help-request.
 * Applies the policy and the per-IP rate limit.
 */
export async function createLearnerHelpRequest(request: Request, input: HelpRequestInput) {
  const actor = await getActor();
  const profileId = actor?.id ?? null;
  authorize(canCreateHelpRequest(actor, profileId));

  const db = getDb();
  await enforce(db, [
    { key: `help:ip:${hashKeyPart(clientIp(request.headers))}`, limit: LIMITS.helpRequestPerIp },
  ]);

  const [created] = await db
    .insert(helpRequests)
    .values({ ...input, profileId, trigger: "learner" })
    .returning({ id: helpRequests.id, status: helpRequests.status });
  if (!created) throw new Error("Help request insert returned no row");
  return created;
}
