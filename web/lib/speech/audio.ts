import "server-only";
import { FfmpegError, runFfmpeg } from "./ffmpeg";
import { SpeechError } from "./types";

/** Limits for uploaded recordings. */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 60;

/** The format every provider gets: 16 kHz, mono, 16-bit PCM WAV. */
export const PCM_SAMPLE_RATE = 16_000;
const BYTES_PER_SECOND = PCM_SAMPLE_RATE * 2;

export type AudioFormat = "webm" | "ogg" | "wav";

/**
 * Detect the format from the file's first bytes, not from its name or the
 * Content-Type header (both are easy to fake).
 */
export function detectAudioFormat(bytes: Uint8Array): AudioFormat | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "webm";
  }
  if (bytes.length >= 4 && ascii(0, 4) === "OggS") return "ogg";
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "wav";
  return null;
}

/** Find the "data" chunk of a PCM WAV and return its size in bytes. */
export function wavDataSize(wav: Uint8Array): number {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = String.fromCharCode(...wav.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "data") return Math.min(size, wav.length - offset - 8);
    offset += 8 + size + (size % 2);
  }
  return 0;
}

/** Duration of our 16 kHz mono 16-bit WAV, in seconds. */
export function pcmWavSeconds(wav: Uint8Array): number {
  return wavDataSize(wav) / BYTES_PER_SECOND;
}

/**
 * Convert an uploaded recording (webm, ogg or wav) to 16 kHz mono WAV and
 * check its length. Decoding stops just after the limit, so a very long
 * file cannot keep the server busy.
 */
export async function toProviderWav(
  input: Uint8Array,
): Promise<{ wav: Uint8Array; seconds: number }> {
  if (input.length === 0) throw new SpeechError("no_audio");
  if (input.length > MAX_AUDIO_BYTES) throw new SpeechError("audio_too_large");
  if (!detectAudioFormat(input)) throw new SpeechError("unsupported_format");

  let wav: Uint8Array;
  try {
    wav = await runFfmpeg(
      [
        "-i",
        "pipe:0",
        "-t",
        String(MAX_AUDIO_SECONDS + 1),
        "-vn",
        "-ac",
        "1",
        "-ar",
        String(PCM_SAMPLE_RATE),
        "-c:a",
        "pcm_s16le",
        "-f",
        "wav",
        "pipe:1",
      ],
      input,
    );
  } catch (error) {
    if (error instanceof FfmpegError) throw new SpeechError("unsupported_format");
    throw error;
  }

  const seconds = pcmWavSeconds(wav);
  if (seconds > MAX_AUDIO_SECONDS) throw new SpeechError("audio_too_long");
  if (seconds < 0.1) throw new SpeechError("no_audio");
  return { wav, seconds };
}

/** Telegram voice note (OGG/Opus) -> the WAV our provider takes. Same checks as uploads. */
export function telegramVoiceToWav(oggOpus: Uint8Array) {
  return toProviderWav(oggOpus);
}

/**
 * Any audio we produce (MP3 or WAV) -> OGG/Opus, the format Telegram's
 * sendVoice needs so the reply shows as a voice note.
 */
export async function toTelegramVoice(audio: Uint8Array): Promise<Uint8Array> {
  return runFfmpeg(
    [
      "-i",
      "pipe:0",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "48000",
      "-c:a",
      "libopus",
      "-b:a",
      "32k",
      "-application",
      "voip",
      "-f",
      "ogg",
      "pipe:1",
    ],
    audio,
  );
}
