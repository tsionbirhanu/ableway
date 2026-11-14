import { encodeWav, resampleTo16k, rms, VoiceActivityDetector } from "./wav";

/**
 * Speech recognition through our server (Gemini or Azure, see lib/speech),
 * with the same shape as the browser's SpeechRecognition. Pages that used
 * `new webkitSpeechRecognition()` can use this instead and keep their code.
 *
 * - Works in every browser with a microphone (Chrome, Edge, Firefox, Safari,
 *   iPhone), unlike browser recognition, which is Chrome/Edge only.
 * - Understands Amharic and English.
 * - Detects when the learner stops talking (about 1.2 s of silence), then
 *   sends one short WAV recording. Silence is never uploaded.
 * - If the server is down, it uses the browser's own recognition (when there
 *   is one) for a minute, so listening keeps working.
 *
 * Results come as one final result per phrase (no interim text).
 */

export type CaptureResult =
  { wav: Uint8Array } | { error: "not-allowed" | "audio-capture" | "no-speech" | "aborted" };

/** Records one spoken answer. */
export interface UtteranceCapture {
  start(): Promise<CaptureResult>;
  /** Finish now and keep what was said so far. */
  stop(): void;
  /** Finish now and throw the recording away. */
  abort(): void;
}

type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type BrowserRecognitionConstructor = new () => BrowserRecognition;

export type RecognitionErrorEvent = { error: string; message?: string };

/** Same shape as the browser's SpeechRecognitionEvent, as far as our pages use it. */
export type RecognitionResultEvent = {
  resultIndex: number;
  results: { length: number; [index: number]: ResultLike };
};
type ResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string; confidence: number };
};

export type RecognitionDeps = {
  createCapture: () => UtteranceCapture | null;
  fetch: typeof fetch;
  browserRecognition: BrowserRecognitionConstructor | undefined;
  now: () => number;
};

const SERVER_COOLDOWN_MS = 60_000;
let serverDownUntil = 0;

/** Test helper. */
export function resetServerRecognitionCooldown(): void {
  serverDownUntil = 0;
}

function browserRecognitionConstructor(): BrowserRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: BrowserRecognitionConstructor;
    webkitSpeechRecognition?: BrowserRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function microphoneAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!(
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext
    )
  );
}

const defaultDeps = (): RecognitionDeps => ({
  createCapture: () => (microphoneAvailable() ? new MicrophoneCapture() : null),
  fetch: (...args) => fetch(...args),
  browserRecognition: browserRecognitionConstructor(),
  now: () => Date.now(),
});

function finalResult(transcript: string, confidence: number | null): RecognitionResultEvent {
  // No score (Gemini): the server already filtered unclear results, so this one passed.
  const alternative = { transcript, confidence: confidence ?? 1 };
  const result: ResultLike = { isFinal: true, length: 1, 0: alternative };
  return { resultIndex: 0, results: { length: 1, 0: result } };
}

export class HybridSpeechRecognition {
  lang = "en-US";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((event: RecognitionResultEvent) => void) | null = null;
  onerror: ((event: RecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  onnomatch: (() => void) | null = null;

  private active = false;
  private aborted = false;
  private capture: UtteranceCapture | null = null;
  private browser: BrowserRecognition | null = null;
  private readonly deps: RecognitionDeps;

  constructor(deps?: Partial<RecognitionDeps>) {
    this.deps = { ...defaultDeps(), ...deps };
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.aborted = false;
    const capture = this.deps.now() >= serverDownUntil ? this.deps.createCapture() : null;
    if (capture) {
      void this.runServer(capture);
    } else if (this.deps.browserRecognition) {
      this.runBrowser(this.deps.browserRecognition);
    } else {
      queueMicrotask(() => {
        this.onerror?.({
          error: "not-supported",
          message: "This device cannot listen. Please type instead.",
        });
        this.end();
      });
    }
  }

  stop(): void {
    this.capture?.stop();
    this.browser?.stop();
  }

  abort(): void {
    this.aborted = true;
    this.capture?.abort();
    this.browser?.abort();
  }

  private end(): void {
    if (!this.active) return;
    this.active = false;
    this.capture = null;
    this.browser = null;
    this.onend?.();
  }

  private async runServer(capture: UtteranceCapture): Promise<void> {
    this.capture = capture;
    this.onstart?.();
    const recorded = await capture.start();
    if (this.aborted) return this.end();
    if ("error" in recorded) {
      if (recorded.error !== "aborted") this.onerror?.({ error: recorded.error });
      return this.end();
    }

    const form = new FormData();
    form.append(
      "audio",
      new Blob([recorded.wav.slice().buffer as ArrayBuffer], { type: "audio/wav" }),
      "speech.wav",
    );
    form.append("language", this.lang);

    let res: Response;
    try {
      res = await this.deps.fetch("/api/speech/transcribe", { method: "POST", body: form });
    } catch {
      serverDownUntil = this.deps.now() + SERVER_COOLDOWN_MS;
      this.onerror?.({ error: "network", message: "The speech service is not working right now." });
      return this.end();
    }
    if (this.aborted) return this.end();

    const body = (await res.json().catch(() => null)) as {
      text?: string;
      confidence?: number | null;
      lowConfidence?: boolean;
      error?: { code?: string; message?: string };
    } | null;

    if (!res.ok) {
      if (res.status >= 500) serverDownUntil = this.deps.now() + SERVER_COOLDOWN_MS;
      // "no_speech" from the server is the same as silence in the browser.
      const error = body?.error?.code === "no_speech" ? "no-speech" : "network";
      this.onerror?.({ error, message: body?.error?.message });
      return this.end();
    }

    const text = body?.text?.trim();
    if (!text || body?.lowConfidence) {
      // Unclear: same as the browser's "no match". The page simply listens again.
      this.onnomatch?.();
      return this.end();
    }
    this.onresult?.(finalResult(text, body?.confidence ?? null));
    this.end();
  }

  private runBrowser(Constructor: BrowserRecognitionConstructor): void {
    const rec = new Constructor();
    this.browser = rec;
    rec.lang = this.lang;
    rec.continuous = this.continuous;
    rec.interimResults = this.interimResults;
    rec.onstart = () => this.onstart?.();
    rec.onresult = (event) => this.onresult?.(event as RecognitionResultEvent);
    rec.onerror = (event) => this.onerror?.(event as RecognitionErrorEvent);
    rec.onend = () => this.end();
    try {
      rec.start();
    } catch {
      queueMicrotask(() => this.end());
    }
  }
}

/**
 * The recognition constructor pages should use instead of
 * window.SpeechRecognition / webkitSpeechRecognition.
 * undefined only when the device can neither record nor recognise speech.
 */
/** What pages need from a recognizer: the browser's own or HybridSpeechRecognition. */
export type RecognitionLike = Pick<
  HybridSpeechRecognition,
  | "lang"
  | "continuous"
  | "interimResults"
  | "onstart"
  | "onresult"
  | "onerror"
  | "onend"
  | "start"
  | "stop"
  | "abort"
>;

export function getSpeechRecognitionConstructor(): typeof HybridSpeechRecognition | undefined {
  return microphoneAvailable() || browserRecognitionConstructor()
    ? HybridSpeechRecognition
    : undefined;
}

// ---------------------------------------------------------------------------
// Microphone capture (Web Audio). Not unit-tested: needs a real browser.
// ---------------------------------------------------------------------------

class MicrophoneCapture implements UtteranceCapture {
  private finalize: ((mode: "keep" | "discard") => void) | null = null;
  private pending: "keep" | "discard" | null = null;

  stop(): void {
    if (this.finalize) this.finalize("keep");
    else this.pending = "keep";
  }

  abort(): void {
    if (this.finalize) this.finalize("discard");
    else this.pending = "discard";
  }

  async start(): Promise<CaptureResult> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      return {
        error:
          name === "NotAllowedError" || name === "SecurityError" ? "not-allowed" : "audio-capture",
      };
    }
    if (this.pending === "discard") {
      stream.getTracks().forEach((track) => track.stop());
      return { error: "aborted" };
    }

    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new Context();
    void context.resume().catch(() => {});
    const source = context.createMediaStreamSource(stream);
    // ScriptProcessor is old but works in every browser, including Safari.
    const processor = context.createScriptProcessor(4096, 1, 1);
    const frames: Float32Array[] = [];
    const vad = new VoiceActivityDetector(performance.now());

    return new Promise<CaptureResult>((resolve) => {
      let done = false;
      const cleanup = () => {
        processor.onaudioprocess = null;
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach((track) => track.stop());
        void context.close().catch(() => {});
      };
      const finish = (result: CaptureResult) => {
        if (done) return;
        done = true;
        clearTimeout(watchdog);
        cleanup();
        resolve(result);
      };
      const encode = (): CaptureResult => {
        if (!vad.hasSpeech) return { error: "no-speech" };
        const total = frames.reduce((sum, frame) => sum + frame.length, 0);
        const samples = new Float32Array(total);
        let offset = 0;
        for (const frame of frames) {
          samples.set(frame, offset);
          offset += frame.length;
        }
        return { wav: encodeWav(resampleTo16k(samples, context.sampleRate)) };
      };

      this.finalize = (mode) => finish(mode === "keep" ? encode() : { error: "aborted" });
      // If the audio system never starts (blocked), do not hang.
      const watchdog = setTimeout(() => {
        if (frames.length === 0) finish({ error: "audio-capture" });
      }, 3000);

      processor.onaudioprocess = (event) => {
        if (done) return;
        const input = event.inputBuffer.getChannelData(0);
        frames.push(new Float32Array(input));
        const decision = vad.push(rms(input), performance.now());
        if (decision === "no-speech") finish({ error: "no-speech" });
        else if (decision === "done" || decision === "too-long") finish(encode());
      };
      source.connect(processor);
      processor.connect(context.destination);

      if (this.pending) this.finalize(this.pending);
    });
  }
}
