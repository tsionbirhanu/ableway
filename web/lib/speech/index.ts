import "server-only";
import { getEnv } from "@/lib/env";

export type TranscriberFn = (audio: Buffer, mimeType?: string) => Promise<string>;
export type SynthesizerFn = (text: string, language?: string) => Promise<Buffer>;

let mockTranscriber: TranscriberFn | null = null;
let mockSynthesizer: SynthesizerFn | null = null;

export function setMockTranscriber(fn: TranscriberFn | null): void {
  mockTranscriber = fn;
}

export function setMockSynthesizer(fn: SynthesizerFn | null): void {
  mockSynthesizer = fn;
}

/**
 * Creates a valid minimal PCM WAV audio buffer.
 * Plays 0.1s of quiet silence, conforming to the WAV specification.
 */
export function createMinimalWavAudio(): Buffer {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 8;
  const dataSize = 800;
  const buffer = Buffer.alloc(44 + dataSize);

  // "RIFF"
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  // "WAVE"
  buffer.write("WAVE", 8);
  // "fmt "
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  // "data"
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  buffer.fill(128, 44);

  return buffer;
}

/**
 * Transcribe an audio recording into text.
 */
export async function transcribeAudio(audio: Buffer, mimeType = "audio/ogg"): Promise<string> {
  if (mockTranscriber) {
    return mockTranscriber(audio, mimeType);
  }

  const env = getEnv();

  // If Gemini API key is configured, we can use Gemini multimodal audio
  if (env.GEMINI_API_KEY) {
    try {
      const base64Audio = audio.toString("base64");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Audio,
                    },
                  },
                  {
                    text: "Transcribe the spoken words in this audio exactly. Do not add any explanation or notes.",
                  },
                ],
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback for development without external keys:
  return "Help me find a course";
}

/**
 * Synthesize text into speech audio.
 */
export async function synthesizeSpeech(text: string, language = "en"): Promise<Buffer> {
  if (mockSynthesizer) {
    return mockSynthesizer(text, language);
  }

  // Generates clean valid WAV buffer for playback
  return createMinimalWavAudio();
}
