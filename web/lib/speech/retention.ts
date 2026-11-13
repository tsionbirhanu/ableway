import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Opt-in audio retention. OFF by default (SPEECH_RETAIN_AUDIO=false): the
 * app keeps uploaded audio only in memory while transcribing, then drops it.
 *
 * When switched on, each recording is saved as a WAV file with a random
 * name (no learner id, no transcript in the file name) and deleted after
 * SPEECH_RETENTION_DAYS. Voice recordings are personal data: switch this on
 * only with the learners' consent and a clear reason (for example, checking
 * recognition quality for Amharic).
 *
 * TODO: per-learner consent. Today it is one setting for everyone.
 * TODO: call pruneRetainedAudio from a cron route protected by CRON_SECRET.
 */

export type RetentionConfig = { enabled: boolean; dir: string; days: number };

export async function retainAudio(
  config: RetentionConfig,
  wav: Uint8Array,
  now: Date = new Date(),
): Promise<string | null> {
  if (!config.enabled) return null;
  await mkdir(config.dir, { recursive: true });
  const name = `${now.toISOString().slice(0, 10)}_${randomUUID()}.wav`;
  await writeFile(join(config.dir, name), wav);
  return name;
}

/** Delete retained files older than the retention period. Returns how many were deleted. */
export async function pruneRetainedAudio(
  config: RetentionConfig,
  now: Date = new Date(),
): Promise<number> {
  let names: string[];
  try {
    names = await readdir(config.dir);
  } catch {
    return 0;
  }
  const cutoff = now.getTime() - config.days * 24 * 60 * 60 * 1000;
  let deleted = 0;
  for (const name of names) {
    if (!name.endsWith(".wav")) continue;
    const path = join(config.dir, name);
    const info = await stat(path);
    if (info.mtimeMs < cutoff) {
      await rm(path, { force: true });
      deleted++;
    }
  }
  return deleted;
}
