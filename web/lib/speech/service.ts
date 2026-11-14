import "server-only";
import { toProviderWav, toTelegramVoice } from "./audio";
import { normalizeLanguage, resolveVoice } from "./languages";
import { noRetention, type RecordingOwner, type RetentionPolicy } from "./retention";
import { logger } from "@/lib/log";
import { TtsCache, ttsCacheKey } from "./tts-cache";
import {
  SpeechError,
  type SpeechToText,
  type SynthesizedAudio,
  type TextToSpeech,
  type Transcription,
} from "./types";

/**
 * Speech use cases, shared by the web routes and the Telegram bot.
 * Dependencies are passed in, so tests run with the mock provider.
 */

export const MAX_TTS_CHARS = 1500;
export const MIN_RATE = 0.5;
export const MAX_RATE = 2;

export type SpeechDeps = {
  providerName: string;
  stt: SpeechToText;
  tts: TextToSpeech;
  cache: TtsCache;
  lowConfidenceThreshold: number;
  /** Decides whether a recording is kept. Defaults to keeping nothing. */
  retention?: RetentionPolicy;
};

export type TranscribeResult = Transcription & {
  /** True when the learner should be asked to repeat or spell. Never act on low-confidence text. */
  lowConfidence: boolean;
  seconds: number;
};

/**
 * Upload (webm, ogg or wav) -> text.
 * The audio lives only in memory: it is converted, sent to the provider,
 * then dropped. It is kept only if the retention policy says so, which
 * needs the operator switch AND the learner's own opt-in (see ./retention.ts).
 */
export async function transcribeRecording(
  deps: SpeechDeps,
  upload: Uint8Array,
  language: string | undefined,
  owner: RecordingOwner = { profileId: null },
): Promise<TranscribeResult> {
  const { wav, seconds } = await toProviderWav(upload);
  try {
    const result = await deps.stt.transcribe(wav, normalizeLanguage(language));
    return {
      ...result,
      seconds,
      lowConfidence: isLowConfidence(result, deps.lowConfidenceThreshold),
    };
  } finally {
    // Retention is opt-in; by default this keeps nothing and the buffers are dropped.
    await (deps.retention ?? noRetention).retain(wav, owner).catch((error: unknown) => {
      logger.error("speech.retain_failed", { error });
    });
  }
}

/**
 * Ask the learner to repeat when the score is low. Without a score (Gemini),
 * we only flag text that has no letters or digits at all; every other answer
 * is read back to the learner for a yes before anything happens.
 */
export function isLowConfidence(result: Transcription, threshold: number): boolean {
  if (result.confidence !== null) return result.confidence < threshold;
  return !/[\p{L}\p{N}]/u.test(result.text);
}

/** Text -> audio, using the cache for repeated phrases. */
export async function synthesizeSpeech(
  deps: SpeechDeps,
  input: { text: string; language?: string; voice?: string; rate?: number },
): Promise<SynthesizedAudio & { cached: boolean }> {
  const text = input.text.trim();
  if (!text) throw new SpeechError("no_audio", "There is no text to read.");
  if (text.length > MAX_TTS_CHARS) throw new SpeechError("text_too_long");

  const language = normalizeLanguage(input.language);
  const voice = resolveVoice(deps.tts, language, input.voice);
  // Round so 1.0 and 1.0000001 share a cache entry.
  const rate = Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, input.rate ?? 1)) * 100) / 100;

  const key = ttsCacheKey({ provider: deps.providerName, text, language, voice, rate });
  const hit = deps.cache.get(key);
  if (hit) return { ...hit, cached: true };

  const audio = await deps.tts.synthesize(text, language, voice, rate);
  deps.cache.set(key, audio);
  return { ...audio, cached: false };
}

// ---------- Telegram voice notes ----------

/** Telegram voice note (OGG/Opus) -> text. Same limits and privacy rules as web uploads. */
export function transcribeTelegramVoice(
  deps: SpeechDeps,
  oggOpus: Uint8Array,
  language?: string,
  owner: RecordingOwner = { profileId: null },
) {
  return transcribeRecording(deps, oggOpus, language, owner);
}

/** Text -> OGG/Opus voice note for Telegram's sendVoice. */
export async function synthesizeTelegramVoice(
  deps: SpeechDeps,
  input: { text: string; language?: string; voice?: string; rate?: number },
): Promise<Uint8Array> {
  const { audio } = await synthesizeSpeech(deps, input);
  return toTelegramVoice(audio);
}
