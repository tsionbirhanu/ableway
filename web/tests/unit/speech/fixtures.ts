import { runFfmpeg } from "@/lib/speech/ffmpeg";

/** A 16-bit mono WAV with a 440 Hz tone. */
export function toneWav(seconds: number, sampleRate = 16_000): Uint8Array {
  const samples = Math.round(seconds * sampleRate);
  const buffer = new Uint8Array(44 + samples * 2);
  const view = new DataView(buffer.buffer);
  const ascii = (offset: number, text: string) =>
    [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    view.setInt16(
      44 + i * 2,
      Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 8000),
      true,
    );
  }
  return buffer;
}

/** What browsers record (MediaRecorder): WebM with Opus. */
export function toWebm(wav: Uint8Array) {
  return runFfmpeg(["-i", "pipe:0", "-c:a", "libopus", "-f", "webm", "pipe:1"], wav);
}

/** What Telegram sends: OGG with Opus. */
export function toOggOpus(wav: Uint8Array) {
  return runFfmpeg(["-i", "pipe:0", "-c:a", "libopus", "-f", "ogg", "pipe:1"], wav);
}

export const containsAscii = (bytes: Uint8Array, text: string) =>
  Buffer.from(bytes).includes(Buffer.from(text, "ascii"));
