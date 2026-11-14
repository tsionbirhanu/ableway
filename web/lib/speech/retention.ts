/**
 * Voice recording retention. OFF by default.
 *
 * The speech service holds uploaded audio only in memory while it is being
 * transcribed, then drops it. After transcribing, it asks a RetentionPolicy
 * whether to keep the recording. The default policy keeps nothing.
 *
 * The production policy (lib/privacy/voice-recordings.ts) keeps a recording
 * only when ALL of these are true:
 *   1. SPEECH_RETAIN_AUDIO=true (an operator switch for the whole app),
 *   2. the speaker is a signed-in learner, and
 *   3. that learner has opted in ("voice_retention" consent, see lib/privacy/consent.ts).
 * Kept recordings expire after SPEECH_RETENTION_DAYS and the retention cron
 * deletes them (app/api/cron/retention).
 */

export type RecordingOwner = { profileId: string | null };

export interface RetentionPolicy {
  /** Decide whether to keep this recording, and keep it if so. Returns true if it was kept. */
  retain(wav: Uint8Array, owner: RecordingOwner): Promise<boolean>;
}

/** Keeps nothing. Used when no learner is known, in tests, and in scripts. */
export const noRetention: RetentionPolicy = {
  async retain() {
    return false;
  },
};
