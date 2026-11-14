import { withApi } from "@/lib/api/handler";
import { readJson } from "@/lib/auth/params";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import {
  consentChangeInput,
  currentConsents,
  CURRENT_POLICY_VERSION,
  recordConsent,
} from "@/lib/privacy/consent";

/**
 * GET: the learner's current choice for each purpose (all opt-in, default off),
 * plus how long voice recordings would be kept.
 * POST { purpose, granted }: record a new choice. Withdrawing voice consent
 * deletes kept recordings at once.
 */
export const GET = withApi({}, async (_request: Request) => {
  const actor = await requireActor();
  const env = getEnv();
  return Response.json({
    policyVersion: CURRENT_POLICY_VERSION,
    consents: await currentConsents(getDb(), actor.id),
    voiceRetention: {
      availableOnThisServer: env.SPEECH_RETAIN_AUDIO,
      days: env.SPEECH_RETENTION_DAYS,
    },
    conversationRetentionDays: env.CONVERSATION_RETENTION_DAYS,
  });
});

export const POST = withApi({}, async (request: Request) => {
  const actor = await requireActor();
  const input = consentChangeInput.parse(await readJson(request));
  const db = getDb();
  await recordConsent(db, { profileId: actor.id, ...input, source: "web" });
  return Response.json({ consents: await currentConsents(db, actor.id) });
});
