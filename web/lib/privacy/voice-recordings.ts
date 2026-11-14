import "server-only";
import { getDb } from "@/lib/db/client";
import { voiceRecordings } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { getEnv } from "@/lib/env";
import type { RecordingOwner, RetentionPolicy } from "@/lib/speech/retention";
import { hasConsent } from "./consent";

const DAY_MS = 24 * 60 * 60 * 1000;

export type VoiceRetentionConfig = { enabled: boolean; days: number };

/**
 * Keep a recording only if the operator switch is on, a learner is known,
 * and that learner has opted in. Returns true if the recording was kept.
 */
export async function retainVoiceRecording(
  db: Db,
  config: VoiceRetentionConfig,
  wav: Uint8Array,
  owner: RecordingOwner,
  now: Date = new Date(),
): Promise<boolean> {
  if (!config.enabled || !owner.profileId) return false;
  if (!(await hasConsent(db, owner.profileId, "voice_retention"))) return false;
  await db.insert(voiceRecordings).values({
    profileId: owner.profileId,
    audio: wav,
    contentType: "audio/wav",
    expiresAt: new Date(now.getTime() + config.days * DAY_MS),
  });
  return true;
}

/** The policy the running app uses. Reads env and the database on each call. */
export function databaseRetentionPolicy(): RetentionPolicy {
  return {
    retain(wav, owner) {
      const env = getEnv();
      return retainVoiceRecording(
        getDb(),
        { enabled: env.SPEECH_RETAIN_AUDIO, days: env.SPEECH_RETENTION_DAYS },
        wav,
        owner,
      );
    },
  };
}
