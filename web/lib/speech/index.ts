import "server-only";
import { getEnv } from "@/lib/env";
import { AzureSpeechToText, AzureTextToSpeech } from "./providers/azure";
import { GeminiSpeechToText, GeminiTextToSpeech } from "./providers/gemini";
import { MockSpeechToText, MockTextToSpeech } from "./providers/mock";
import type { SpeechDeps } from "./service";
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
    retention: {
      enabled: env.SPEECH_RETAIN_AUDIO,
      dir: env.SPEECH_RETENTION_DIR,
      days: env.SPEECH_RETENTION_DAYS,
    },
  };
}
