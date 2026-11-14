import "server-only";
import { getEnv } from "@/lib/env";
import { databaseRetentionPolicy } from "@/lib/privacy/voice-recordings";

import { AzureSpeechToText, AzureTextToSpeech } from "./providers/azure";
import { GeminiSpeechToText, GeminiTextToSpeech } from "./providers/gemini";
import { MockSpeechToText, MockTextToSpeech } from "./providers/mock";
import {
  MAX_TTS_CHARS,
  synthesizeTelegramVoice,
  transcribeTelegramVoice,
  type SpeechDeps,
} from "./service";
import { TtsCache } from "./tts-cache";
import type { SpeechToText, TextToSpeech } from "./types";

export type SpeechProviders = { name: string; stt: SpeechToText; tts: TextToSpeech };

let cached: SpeechProviders | undefined;

/** The providers chosen by SPEECH_PROVIDER ("gemini", "azure" or "mock"). Created once. */
export function getSpeechProviders(): SpeechProviders {
  if (cached) return cached;
  const env = getEnv();
  if (env.SPEECH_PROVIDER === "gemini") {
    // parseEnv already checked GEMINI_API_KEY is set when SPEECH_PROVIDER=gemini.
    const key = env.GEMINI_API_KEY!;
    cached = {
      name: "gemini",
      stt: new GeminiSpeechToText({ key }),
      tts: new GeminiTextToSpeech({ key }),
    };
  } else if (env.SPEECH_PROVIDER === "azure") {
    // parseEnv already checked these are set when SPEECH_PROVIDER=azure.
    const region = env.AZURE_SPEECH_REGION!;
    cached = {
      name: "azure",
      stt: new AzureSpeechToText({ key: env.STT_API_KEY!, region }),
      tts: new AzureTextToSpeech({ key: env.TTS_API_KEY!, region }),
    };
  } else {
    cached = { name: "mock", stt: new MockSpeechToText(), tts: new MockTextToSpeech() };
  }
  return cached;
}

/** Test helper. */
export function setSpeechProvidersForTests(providers: SpeechProviders | undefined): void {
  cached = providers;
}

// ---------- Shared dependencies for routes and the Telegram bot ----------

const ttsCache = new TtsCache();

export function getSpeechDeps(): SpeechDeps {
  const env = getEnv();
  const providers = getSpeechProviders();
  return {
    providerName: providers.name,
    stt: providers.stt,
    tts: providers.tts,
    cache: ttsCache,
    lowConfidenceThreshold: env.SPEECH_LOW_CONFIDENCE_THRESHOLD,
    retention: databaseRetentionPolicy(),
  };
}

// ---------- Telegram voice notes ----------

/** Test hooks: replace speech for the Telegram bot without ffmpeg or a provider. */
export type VoiceNoteTranscriber = (audio: Uint8Array, language: string) => Promise<string>;
export type VoiceNoteSynthesizer = (text: string, language: string) => Promise<Uint8Array>;

let mockTranscriber: VoiceNoteTranscriber | null = null;
let mockSynthesizer: VoiceNoteSynthesizer | null = null;

export function setMockTranscriber(fn: VoiceNoteTranscriber | null): void {
  mockTranscriber = fn;
}

export function setMockSynthesizer(fn: VoiceNoteSynthesizer | null): void {
  mockSynthesizer = fn;
}

/**
 * Telegram voice note (OGG/Opus) -> text, through the same speech service,
 * limits, and retention rules as web uploads. Throws SpeechError when the
 * audio cannot be understood; it never guesses a transcript.
 */
export async function transcribeVoiceNote(
  audio: Uint8Array,
  language: string,
  profileId: string | null,
): Promise<string> {
  if (mockTranscriber) return mockTranscriber(audio, language);
  const result = await transcribeTelegramVoice(getSpeechDeps(), audio, language, { profileId });
  return result.text;
}

/** Text -> OGG/Opus voice note for Telegram's sendVoice. */
export async function synthesizeVoiceNote(text: string, language: string): Promise<Uint8Array> {
  if (mockSynthesizer) return mockSynthesizer(text, language);
  return synthesizeTelegramVoice(getSpeechDeps(), {
    text: text.slice(0, MAX_TTS_CHARS),
    language,
  });
}
