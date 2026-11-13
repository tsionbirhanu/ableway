import { HttpError } from "@/lib/auth/errors";

/**
 * Speech interfaces. The app talks only to these, so providers can be
 * swapped by setting SPEECH_PROVIDER (see ./index.ts).
 */

/** App language codes (what profiles store). */
export type AppLanguage = string;

export type Transcription = {
  text: string;
  /** Language the provider used, as an app code like "en" or "am". */
  language: AppLanguage;
  /**
   * 0 to 1, or null when the provider gives no score (Gemini). With no score,
   * the app relies on reading the answer back to the learner before acting.
   */
  confidence: number | null;
};

export type SynthesizedAudio = {
  audio: Uint8Array;
  /** For example "audio/mpeg" or "audio/wav". */
  contentType: string;
};

export interface SpeechToText {
  /** `audio` is 16 kHz mono 16-bit PCM WAV (the app converts uploads first). */
  transcribe(audio: Uint8Array, language: AppLanguage): Promise<Transcription>;
}

export interface TextToSpeech {
  /** Voices this provider offers for an app language. The first is the default. */
  voices(language: AppLanguage): readonly string[];
  /** `voice` is already checked against voices(). `rate` is a multiplier: 1 is normal, 1.5 is 50% faster. */
  synthesize(
    text: string,
    language: AppLanguage,
    voice: string | undefined,
    rate: number,
  ): Promise<SynthesizedAudio>;
}

/**
 * Speech errors. `message` is short and plain, because the frontend reads
 * it aloud to the learner. `code` lets the frontend choose what to do next.
 */
export type SpeechErrorCode =
  | "no_audio"
  | "unsupported_format"
  | "audio_too_large"
  | "audio_too_long"
  | "no_speech"
  | "text_too_long"
  | "language_not_supported"
  | "voice_not_supported"
  | "speech_unavailable";

const statusFor: Record<SpeechErrorCode, number> = {
  no_audio: 400,
  unsupported_format: 415,
  audio_too_large: 413,
  audio_too_long: 413,
  no_speech: 422,
  text_too_long: 413,
  language_not_supported: 422,
  voice_not_supported: 422,
  speech_unavailable: 503,
};

export const speechMessages: Record<SpeechErrorCode, string> = {
  no_audio: "We did not get any sound. Please try again.",
  unsupported_format: "We cannot use this kind of recording. Please try again.",
  audio_too_large: "That recording is too big. Please keep it under one minute.",
  audio_too_long: "That recording is too long. Please speak for less than one minute.",
  no_speech: "I did not hear any words. Please try again, a little closer to the microphone.",
  text_too_long: "That text is too long to read aloud in one go.",
  language_not_supported: "Speech is not available in this language yet. You can use text instead.",
  voice_not_supported: "That voice is not available. Please choose another voice.",
  speech_unavailable:
    "The speech service is not working right now. You can type instead, or ask a helper.",
};

export class SpeechError extends HttpError {
  constructor(
    public readonly speechCode: SpeechErrorCode,
    message: string = speechMessages[speechCode],
  ) {
    super(statusFor[speechCode], speechCode, message);
  }
}
