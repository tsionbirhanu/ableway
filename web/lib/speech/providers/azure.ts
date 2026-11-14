import { logger } from "@/lib/log";
import { resolveVoice, speechLanguage } from "../languages";
import {
  SpeechError,
  type SpeechToText,
  type SynthesizedAudio,
  type TextToSpeech,
  type Transcription,
} from "../types";

/**
 * Azure AI Speech over REST. Chosen because it supports Amharic both ways
 * (recognition and natural voices), as well as English.
 *
 * Docs: speech-to-text "REST API for short audio" (max 60 s) and
 * text-to-speech REST API. Keys: STT_API_KEY / TTS_API_KEY (the same Azure
 * Speech key works for both), region: AZURE_SPEECH_REGION.
 */

type Fetch = typeof fetch;
type AzureConfig = { key: string; region: string; fetch?: Fetch; timeoutMs?: number };

const REQUEST_TIMEOUT_MS = 20_000;

/** Azure "detailed" recognition result (only the fields we use). */
type AzureRecognition = {
  RecognitionStatus: string;
  DisplayText?: string;
  NBest?: { Confidence?: number; Display?: string }[];
};

async function call(config: AzureConfig, url: string, init: RequestInit): Promise<Response> {
  const doFetch = config.fetch ?? fetch;
  let res: Response;
  try {
    res = await doFetch(url, {
      ...init,
      signal: AbortSignal.timeout(config.timeoutMs ?? REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SpeechError("speech_unavailable");
  }
  if (!res.ok) {
    // 401/403 bad key, 429 provider quota, 5xx outage: the learner hears the same plain message.
    logger.error("speech.azure.http_error", { status: res.status, path: url.split("?")[0] });
    throw new SpeechError("speech_unavailable");
  }
  return res;
}

export class AzureSpeechToText implements SpeechToText {
  constructor(private readonly config: AzureConfig) {}

  async transcribe(audio: Uint8Array, language: string): Promise<Transcription> {
    const { code, locale } = speechLanguage(language);
    const url =
      `https://${this.config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` +
      `?language=${encodeURIComponent(locale)}&format=detailed`;

    const res = await call(this.config, url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": this.config.key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        Accept: "application/json",
      },
      body: Buffer.from(audio),
    });

    const result = (await res.json()) as AzureRecognition;
    if (
      result.RecognitionStatus === "NoMatch" ||
      result.RecognitionStatus === "InitialSilenceTimeout"
    ) {
      throw new SpeechError("no_speech");
    }
    if (result.RecognitionStatus !== "Success") throw new SpeechError("speech_unavailable");

    const best = result.NBest?.[0];
    const text = (best?.Display ?? result.DisplayText ?? "").trim();
    if (!text) throw new SpeechError("no_speech");
    const confidence = Math.min(1, Math.max(0, best?.Confidence ?? 0));
    return { text, language: code, confidence };
  }
}

/** Escape text for SSML, so learner text can never change the voice or markup. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 1 -> "+0%", 1.5 -> "+50%", 0.8 -> "-20%". */
export function ssmlRate(rate: number): string {
  const percent = Math.round((rate - 1) * 100);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

export function buildSsml(text: string, locale: string, voice: string, rate: number): string {
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">` +
    `<voice name="${voice}"><prosody rate="${ssmlRate(rate)}">${escapeXml(text)}</prosody></voice>` +
    `</speak>`
  );
}

/** Azure neural voices per app language. The first is the default. */
export const AZURE_VOICES: Record<string, readonly string[]> = {
  en: ["en-US-JennyNeural", "en-US-GuyNeural"],
  am: ["am-ET-MekdesNeural", "am-ET-AmehaNeural"],
};

export class AzureTextToSpeech implements TextToSpeech {
  constructor(private readonly config: AzureConfig) {}

  voices(language: string): readonly string[] {
    return AZURE_VOICES[language] ?? [];
  }

  async synthesize(
    text: string,
    language: string,
    voice: string | undefined,
    rate: number,
  ): Promise<SynthesizedAudio> {
    const { locale } = speechLanguage(language);
    const voiceName = resolveVoice(this, language, voice);
    const res = await call(
      this.config,
      `https://${this.config.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.config.key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "ableway",
        },
        body: buildSsml(text, locale, voiceName, rate),
      },
    );
    const audio = new Uint8Array(await res.arrayBuffer());
    if (audio.length === 0) throw new SpeechError("speech_unavailable");
    return { audio, contentType: "audio/mpeg" };
  }
}
