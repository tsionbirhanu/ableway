/**
 * Browser-side audio helpers for server speech recognition.
 * Pure functions (no browser APIs), so they are easy to test.
 */

export const TARGET_SAMPLE_RATE = 16_000;

/** Resample mono float audio to 16 kHz with linear interpolation. */
export function resampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_SAMPLE_RATE) return input;
  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const fraction = position - left;
    output[i] = input[left]! * (1 - fraction) + input[right]! * fraction;
  }
  return output;
}

/** 16 kHz mono float samples -> 16-bit PCM WAV bytes (the format the server prefers). */
export function encodeWav(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE): Uint8Array {
  const dataSize = samples.length * 2;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
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
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i]! * frame[i]!;
  return Math.sqrt(sum / Math.max(1, frame.length));
}

export type VadDecision = "waiting" | "speaking" | "done" | "no-speech" | "too-long";

export type VadOptions = {
  /** Stop after this much silence once speech has started. */
  silenceMs: number;
  /** Give up if no speech starts within this time. */
  noSpeechMs: number;
  /** Hard limit for one answer. */
  maxMs: number;
  /** Lowest level that counts as speech, whatever the room noise. */
  minLevel: number;
};

/** Above this, a "quiet" frame is probably already speech, not room noise. */
const MAX_NOISE_FLOOR = 0.05;

export const defaultVadOptions: VadOptions = {
  silenceMs: 1200,
  noSpeechMs: 8000,
  maxMs: 30_000,
  minLevel: 0.012,
};

/**
 * Simple voice activity detection: learns the room's noise level from the
 * first frames, then decides when the learner started and stopped talking.
 * This replaces the browser's own "end of speech" detection.
 */
export class VoiceActivityDetector {
  private noiseFloor = 0;
  private calibrationFrames = 0;
  private loudFrames = 0;
  private speechStartedAt: number | null = null;
  private lastVoiceAt = 0;

  constructor(
    private readonly startedAt: number,
    private readonly options: VadOptions = defaultVadOptions,
  ) {}

  get hasSpeech(): boolean {
    return this.speechStartedAt !== null;
  }

  /** Feed the level of one frame. Returns what to do next. */
  push(level: number, now: number): VadDecision {
    const elapsed = now - this.startedAt;
    if (this.calibrationFrames < 4 && this.speechStartedAt === null) {
      // Room noise = the quietest of the first frames, capped, so a learner who
      // starts talking the moment the mic opens is not mistaken for noise.
      this.noiseFloor = this.calibrationFrames === 0 ? level : Math.min(this.noiseFloor, level);
      this.noiseFloor = Math.min(this.noiseFloor, MAX_NOISE_FLOOR);
      this.calibrationFrames++;
    }
    const threshold = Math.max(this.options.minLevel, this.noiseFloor * 2.5);

    if (level > threshold) {
      this.loudFrames++;
      this.lastVoiceAt = now;
      // Two loud frames in a row, so a single click does not count as speech.
      if (this.speechStartedAt === null && this.loudFrames >= 2) this.speechStartedAt = now;
    } else {
      this.loudFrames = 0;
    }

    if (elapsed > this.options.maxMs)
      return this.speechStartedAt === null ? "no-speech" : "too-long";
    if (this.speechStartedAt === null) {
      return elapsed > this.options.noSpeechMs ? "no-speech" : "waiting";
    }
    return now - this.lastVoiceAt > this.options.silenceMs ? "done" : "speaking";
  }
}
