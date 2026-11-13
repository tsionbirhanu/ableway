import { SpeechError, type AppLanguage, type TextToSpeech } from "./types";

/**
 * Which app languages have speech.
 *
 * Speech is offered in English and Amharic only (a product decision).
 * Requests in any other language get a clear "not available in this
 * language" error, and the learner can use text instead.
 *
 * Voices belong to each provider (TextToSpeech.voices). Only listed voices
 * are accepted, so a request can never pick an arbitrary voice.
 */
type LanguageSpeech = {
  /** BCP 47 locale sent to providers. */
  locale: string;
};

export const speechLanguages: Record<string, LanguageSpeech> = {
  en: { locale: "en-US" },
  am: { locale: "am-ET" },
};

/** "am-ET" or "AM" -> "am". */
export function normalizeLanguage(language: string | undefined): AppLanguage {
  return (language ?? "en").trim().toLowerCase().split(/[-_]/)[0] || "en";
}

export function speechLanguage(
  language: string | undefined,
): LanguageSpeech & { code: AppLanguage } {
  const code = normalizeLanguage(language);
  const entry = speechLanguages[code];
  if (!entry) throw new SpeechError("language_not_supported");
  return { code, ...entry };
}

/** The voice to use: the requested one if this provider offers it for the language, else its default. */
export function resolveVoice(
  tts: Pick<TextToSpeech, "voices">,
  language: string | undefined,
  voice: string | undefined,
): string {
  const voices = tts.voices(speechLanguage(language).code);
  if (voices.length === 0) throw new SpeechError("language_not_supported");
  if (!voice || voice === "default") return voices[0]!;
  if (!voices.includes(voice)) throw new SpeechError("voice_not_supported");
  return voice;
}
