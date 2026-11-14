import { logger } from "@/lib/log";
import { speechLanguage } from "../languages";
import {
  SpeechError,
  type SpeechToText,
  type SynthesizedAudio,
  type TextToSpeech,
  type Transcription,
} from "../types";

/**
 * Google Gemini speech, using the same key as the assistant (GEMINI_API_KEY).
 *
 * - Speech-to-text: gemini-3.5-transcribe through the Interactions API.
 *   Supports Amharic and English. It gives NO confidence score, so
 *   `confidence` is null and the app reads answers back for confirmation.
 * - Text-to-speech: gemini-3.8-flash-tts. Returns 24 kHz mono WAV. The
 *   language is detected from the text. Speed has no exact setting: it is
 *   described in words ("a little faster than normal").
 *
 * Learner text goes only in the text part, never in the style instruction,
 * so it cannot change how the voice is set up.
 */

const API = "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_TRANSCRIBE_MODEL = "gemini-3.5-transcribe";
export const GEMINI_TTS_MODEL = "gemini-3.8-flash-tts";

/** Gemini prebuilt voices. They work in every language; the first is the default. */
export const GEMINI_VOICES: readonly string[] = ["Kore", "Zephyr", "Puck", "Charon"];

type Fetch = typeof fetch;
type GeminiConfig = { key: string; fetch?: Fetch; timeoutMs?: number };

async function call(config: GeminiConfig, url: string, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await (config.fetch ?? fetch)(url, {
      method: "POST",
      headers: { "x-goog-api-key": config.key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs ?? 30_000),
    });
  } catch {
    throw new SpeechError("speech_unavailable");
  }
  if (!res.ok) {
    // 400 bad request, 403 key, 429 quota, 5xx outage. Never log the key or the audio.
    logger.error("speech.gemini.http_error", { status: res.status, path: url.replace(API, "") });
    throw new SpeechError("speech_unavailable");
  }
  return res.json();
}

/** The parts of an Interactions API response we read. */
type Interaction = {
  status?: string;
  steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
};

export class GeminiSpeechToText implements SpeechToText {
  constructor(private readonly config: GeminiConfig) {}

  async transcribe(audio: Uint8Array, language: string): Promise<Transcription> {
    const { code, locale } = speechLanguage(language);
    const result = (await call(this.config, `${API}/interactions`, {
      model: `models/${GEMINI_TRANSCRIBE_MODEL}`,
      input: [
        { type: "audio", data: Buffer.from(audio).toString("base64"), mime_type: "audio/wav" },
      ],
      generation_config: { transcription_config: { language_codes: [locale] } },
    })) as Interaction;

    if (result.status !== "completed") throw new SpeechError("speech_unavailable");
    const text = (result.steps ?? [])
      .filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text!.trim())
      .join(" ")
      .trim();
    if (!text) throw new SpeechError("no_speech");
    return { text, language: code, confidence: null };
  }
}

/** Speed in words, because Gemini TTS has no exact rate setting. */
export function paceStyle(rate: number): string {
  const pace =
    rate < 0.85
      ? "slowly"
      : rate <= 1.15
        ? "at a normal pace"
        : rate <= 1.6
          ? "a little faster than normal"
          : "quickly";
  return `Speak calmly and clearly, ${pace}.`;
}

type GenerateContentResponse = {
  candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
};

export class GeminiTextToSpeech implements TextToSpeech {
  constructor(private readonly config: GeminiConfig) {}

  voices(language: string): readonly string[] {
    // Only languages the app offers speech in (English and Amharic).
    return language in { en: 1, am: 1 } ? GEMINI_VOICES : [];
  }

  async synthesize(
    text: string,
    language: string,
    voice: string | undefined,
    rate: number,
  ): Promise<SynthesizedAudio> {
    speechLanguage(language); // throws for languages without speech
    const result = (await call(this.config, `${API}/models/${GEMINI_TTS_MODEL}:generateContent`, {
      contents: [{ role: "user", parts: [{ text, speech_metadata: { style: paceStyle(rate) } }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { voice: voice ?? GEMINI_VOICES[0] } },
      },
    })) as GenerateContentResponse;

    const inline = result.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData?.data,
    )?.inlineData;
    if (!inline?.data) throw new SpeechError("speech_unavailable");
    const audio = new Uint8Array(Buffer.from(inline.data, "base64"));
    if (audio.length === 0) throw new SpeechError("speech_unavailable");
    return { audio, contentType: inline.mimeType || "audio/wav" };
  }
}
