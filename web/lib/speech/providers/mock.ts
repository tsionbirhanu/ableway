import { resolveVoice, speechLanguage } from "../languages";
import type { SpeechToText, SynthesizedAudio, TextToSpeech, Transcription } from "../types";

/**
 * Mock providers for tests and for local development without an Azure key.
 * They follow the same language and voice rules as the real provider, so
 * tests catch unsupported languages too. No network calls.
 */

export class MockSpeechToText implements SpeechToText {
  /** Every call, for tests to inspect. */
  readonly calls: { audioBytes: number; language: string }[] = [];

  constructor(
    private readonly reply: { text: string; confidence: number } = {
      text: "Help me find a course",
      confidence: 0.95,
    },
  ) {}

  async transcribe(audio: Uint8Array, language: string): Promise<Transcription> {
    const { code } = speechLanguage(language);
    this.calls.push({ audioBytes: audio.length, language: code });
    return { text: this.reply.text, language: code, confidence: this.reply.confidence };
  }
}

/** A valid, silent 16 kHz mono WAV. Longer text gives longer silence (capped). */
export function silentWav(seconds: number): Uint8Array {
  const sampleRate = 16_000;
  const dataSize = Math.round(sampleRate * seconds) * 2;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);
  const ascii = (offset: number, text: string) =>
    [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataSize, true);
  return buffer;
}

export class MockTextToSpeech implements TextToSpeech {
  voices(language: string): readonly string[] {
    return [`mock-${language}-1`, `mock-${language}-2`];
  }

  readonly calls: { text: string; language: string; voice: string; rate: number }[] = [];

  async synthesize(
    text: string,
    language: string,
    voice: string | undefined,
    rate: number,
  ): Promise<SynthesizedAudio> {
    const { code } = speechLanguage(language);
    const voiceName = resolveVoice(this, language, voice);
    this.calls.push({ text, language: code, voice: voiceName, rate });
    const seconds = Math.min(5, Math.max(0.2, text.length / 15 / rate));
    return { audio: silentWav(seconds), contentType: "audio/wav" };
  }
}
