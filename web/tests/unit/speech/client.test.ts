import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  guessLanguage,
  MAX_CHUNK_CHARS,
  SpeechPlayer,
  splitForSpeech,
  toAppLanguage,
} from "@/lib/speech/client/player";
import {
  HybridSpeechRecognition,
  resetServerRecognitionCooldown,
  type RecognitionResultEvent,
  type UtteranceCapture,
} from "@/lib/speech/client/recognition";
import { encodeWav, resampleTo16k, rms, VoiceActivityDetector } from "@/lib/speech/client/wav";
import { detectAudioFormat, pcmWavSeconds } from "@/lib/speech/audio";

// ---------------------------------------------------------------- wav.ts

describe("browser audio helpers", () => {
  it("resamples 48 kHz to 16 kHz", () => {
    const input = new Float32Array(48_000).fill(0.5);
    const output = resampleTo16k(input, 48_000);
    expect(output.length).toBe(16_000);
    expect(output[100]).toBeCloseTo(0.5);
  });

  it("encodes a WAV the server accepts, with the right length", () => {
    const wav = encodeWav(new Float32Array(16_000 * 2));
    expect(detectAudioFormat(wav)).toBe("wav");
    expect(pcmWavSeconds(wav)).toBe(2);
  });

  it("clips loud samples instead of wrapping around", () => {
    const wav = encodeWav(new Float32Array([2, -2]));
    const view = new DataView(wav.buffer);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
  });

  it("measures loudness", () => {
    expect(rms(new Float32Array([0.5, -0.5]))).toBeCloseTo(0.5);
    expect(rms(new Float32Array(0))).toBe(0);
  });
});

describe("VoiceActivityDetector", () => {
  const options = { silenceMs: 1000, noSpeechMs: 5000, maxMs: 20_000, minLevel: 0.01 };

  it("waits, hears speech, then finishes after a pause", () => {
    const vad = new VoiceActivityDetector(0, options);
    for (let t = 0; t < 400; t += 100) expect(vad.push(0.002, t)).toBe("waiting");
    expect(vad.push(0.2, 500)).toBe("waiting"); // one loud frame is not speech yet
    expect(vad.push(0.2, 600)).toBe("speaking");
    expect(vad.hasSpeech).toBe(true);
    expect(vad.push(0.002, 1200)).toBe("speaking");
    expect(vad.push(0.002, 1700)).toBe("done");
  });

  it("ignores a single click", () => {
    const vad = new VoiceActivityDetector(0, options);
    vad.push(0.002, 0);
    vad.push(0.5, 100);
    vad.push(0.002, 200);
    expect(vad.hasSpeech).toBe(false);
  });

  it("gives up when nobody speaks", () => {
    const vad = new VoiceActivityDetector(0, options);
    expect(vad.push(0.002, 5100)).toBe("no-speech");
  });

  it("adapts to a noisy room", () => {
    const vad = new VoiceActivityDetector(0, options);
    for (let t = 0; t < 400; t += 100) vad.push(0.05, t); // fan noise
    vad.push(0.06, 500);
    vad.push(0.06, 600);
    expect(vad.hasSpeech).toBe(false);
    vad.push(0.3, 700);
    vad.push(0.3, 800);
    expect(vad.hasSpeech).toBe(true);
  });

  it("hears a learner who starts talking the moment the mic opens", () => {
    const vad = new VoiceActivityDetector(0, options);
    expect(vad.push(0.2, 0)).toBe("waiting");
    expect(vad.push(0.2, 100)).toBe("speaking");
  });

  it("stops very long answers", () => {
    const vad = new VoiceActivityDetector(0, options);
    vad.push(0.2, 0);
    vad.push(0.2, 100);
    expect(vad.push(0.2, 20_100)).toBe("too-long");
  });
});

// ---------------------------------------------------------------- player.ts

describe("splitForSpeech", () => {
  it("keeps short text whole and tidies spaces", () => {
    expect(splitForSpeech("  Hello   there. ")).toEqual(["Hello there."]);
    expect(splitForSpeech("   ")).toEqual([]);
  });

  it("splits long lessons at sentence ends, including Amharic ።", () => {
    const sentence = "ይህ ረጅም ዓረፍተ ነገር ነው። ".repeat(120);
    const chunks = splitForSpeech(sentence);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
      expect(chunk.endsWith("።")).toBe(true);
    }
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(sentence.trim().replace(/\s+/g, " "));
  });

  it("splits one huge sentence at spaces", () => {
    const words = "word ".repeat(700).trim();
    const chunks = splitForSpeech(words, 100);
    expect(chunks.every((c) => c.length <= 100)).toBe(true);
    expect(chunks.join(" ")).toBe(words);
  });
});

describe("language helpers", () => {
  it("guesses Amharic from Ethiopic script", () => {
    expect(guessLanguage("ሰላም")).toBe("am");
    expect(guessLanguage("Hello")).toBe("en");
    expect(toAppLanguage("am-ET", "Hello")).toBe("am");
    expect(toAppLanguage(undefined, "ሰላም")).toBe("am");
    expect(toAppLanguage("en-US", "ሰላም")).toBe("en");
  });
});

describe("SpeechPlayer", () => {
  const played: string[] = [];
  let browserSpoken: string[];

  beforeEach(() => {
    played.length = 0;
    browserSpoken = [];
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
    vi.stubGlobal(
      "Audio",
      class {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        volume = 1;
        src: string;
        constructor(src: string) {
          this.src = src;
        }
        play() {
          played.push(this.src);
          setTimeout(() => this.onended?.(), 0);
          return Promise.resolve();
        }
        pause() {}
      },
    );
    vi.stubGlobal("window", {
      speechSynthesis: {
        speak: (u: { text: string; onend?: () => void }) => {
          browserSpoken.push(u.text);
          setTimeout(() => u.onend?.(), 0);
        },
        cancel: () => {},
      },
    });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        text: string;
        lang = "";
        rate = 1;
        volume = 1;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const audioResponse = () =>
    new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } });

  it("plays server audio and sends language and rate", async () => {
    const fetch = vi.fn(async () => audioResponse());
    const player = new SpeechPlayer(fetch as typeof globalThis.fetch);
    expect(await player.speak("ሰላም", { rate: 0.8 })).toBe(true);
    expect(played).toHaveLength(1);
    const call = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(call[1].body));
    expect(body).toEqual({ text: "ሰላም", language: "am", rate: 0.8 });
  });

  it("falls back to the browser voice when the server fails, then skips the server for a while", async () => {
    let now = 1000;
    const fetch = vi.fn(async () => new Response("{}", { status: 503 }));
    const player = new SpeechPlayer(fetch as typeof globalThis.fetch, () => now);
    expect(await player.speak("Hello")).toBe(true);
    expect(browserSpoken).toEqual(["Hello"]);

    await player.speak("Again");
    expect(fetch).toHaveBeenCalledTimes(1); // still cooling down
    expect(browserSpoken).toEqual(["Hello", "Again"]);

    now += 61_000;
    fetch.mockImplementation(async () => audioResponse());
    await player.speak("Back");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("falls back for unsupported languages without a cooldown", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ error: { code: "language_not_supported" } }, { status: 422 }),
    );
    const player = new SpeechPlayer(fetch as typeof globalThis.fetch);
    await player.speak("Hi");
    await player.speak("Hi again");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(browserSpoken).toEqual(["Hi", "Hi again"]);
  });

  it("uses the browser voice when the server only has the silent mock", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(new Uint8Array([1]), {
          headers: { "Content-Type": "audio/wav", "X-Speech-Provider": "mock" },
        }),
    );
    const player = new SpeechPlayer(fetch as typeof globalThis.fetch);
    await player.speak("Hello");
    expect(played).toHaveLength(0);
    expect(browserSpoken).toEqual(["Hello"]);
  });

  it("speaks a long lesson in order, part by part", async () => {
    const fetch = vi.fn(async () => audioResponse());
    const player = new SpeechPlayer(fetch as typeof globalThis.fetch);
    const lesson = "This is one sentence of the lesson. ".repeat(100);
    await player.speak(lesson);
    const parts = splitForSpeech(lesson);
    expect(fetch).toHaveBeenCalledTimes(parts.length);
    expect(played).toHaveLength(parts.length);
  });

  it("resolves false when cancelled, so a restart is not marked as finished", async () => {
    let release: (r: Response) => void = () => {};
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (release = resolve)));
    const player = new SpeechPlayer(fetch as unknown as typeof globalThis.fetch);
    const first = player.speak("First");
    player.cancel();
    release(audioResponse());
    expect(await first).toBe(false);
    expect(played).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- recognition.ts

describe("HybridSpeechRecognition", () => {
  beforeEach(() => resetServerRecognitionCooldown());

  const wav = encodeWav(new Float32Array(16_000));
  const captureOf = (result: Awaited<ReturnType<UtteranceCapture["start"]>>): UtteranceCapture => ({
    start: async () => result,
    stop: vi.fn(),
    abort: vi.fn(),
  });

  function run(rec: HybridSpeechRecognition) {
    const events: string[] = [];
    let result: RecognitionResultEvent | null = null;
    let error: { error: string; message?: string } | null = null;
    rec.onstart = () => events.push("start");
    rec.onresult = (e) => {
      events.push("result");
      result = e;
    };
    rec.onerror = (e) => {
      events.push("error");
      error = e;
    };
    rec.onnomatch = () => events.push("nomatch");
    const ended = new Promise<void>((resolve) => {
      rec.onend = () => {
        events.push("end");
        resolve();
      };
    });
    rec.start();
    return { events, ended, result: () => result, error: () => error };
  }

  it("records, sends WAV with the language, and gives a browser-style final result", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ text: "ሰላም", confidence: null, lowConfidence: false }),
    );
    const rec = new HybridSpeechRecognition({
      createCapture: () => captureOf({ wav }),
      fetch,
      browserRecognition: undefined,
    });
    rec.lang = "am-ET";
    const r = run(rec);
    await r.ended;

    expect(r.events).toEqual(["start", "result", "end"]);
    const event = r.result()!;
    expect(event.resultIndex).toBe(0);
    expect(event.results[0]!.isFinal).toBe(true);
    expect(event.results[0]![0]!.transcript).toBe("ሰላም");

    const form = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get("language")).toBe("am-ET");
    expect(form.get("audio")).toBeInstanceOf(Blob);
  });

  it("treats unclear speech as no match, so the page simply listens again", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ text: "...", confidence: null, lowConfidence: true }),
    );
    const r = run(
      new HybridSpeechRecognition({
        createCapture: () => captureOf({ wav }),
        fetch,
        browserRecognition: undefined,
      }),
    );
    await r.ended;
    expect(r.events).toEqual(["start", "nomatch", "end"]);
  });

  it("reports microphone permission the same way as the browser", async () => {
    const r = run(
      new HybridSpeechRecognition({
        createCapture: () => captureOf({ error: "not-allowed" }),
        fetch: vi.fn(),
        browserRecognition: undefined,
      }),
    );
    await r.ended;
    expect(r.error()).toEqual({ error: "not-allowed" });
  });

  it("never uploads silence", async () => {
    const fetch = vi.fn();
    const r = run(
      new HybridSpeechRecognition({
        createCapture: () => captureOf({ error: "no-speech" }),
        fetch,
        browserRecognition: undefined,
      }),
    );
    await r.ended;
    expect(fetch).not.toHaveBeenCalled();
    expect(r.error()).toEqual({ error: "no-speech" });
  });

  it("passes the server's spoken message through, and uses browser recognition while the server is down", async () => {
    const fetch = vi.fn(async () =>
      Response.json(
        {
          error: {
            code: "speech_unavailable",
            message: "The speech service is not working right now.",
          },
        },
        { status: 503 },
      ),
    );
    const browserStarted = vi.fn();
    class FakeBrowserRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      onstart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        browserStarted(this.lang);
        queueMicrotask(() => this.onend?.());
      }
      stop() {}
      abort() {}
    }
    const deps = {
      createCapture: () => captureOf({ wav }),
      fetch,
      browserRecognition: FakeBrowserRecognition,
    };

    const first = run(new HybridSpeechRecognition(deps));
    await first.ended;
    expect(first.error()).toEqual({
      error: "network",
      message: "The speech service is not working right now.",
    });

    const second = new HybridSpeechRecognition(deps);
    second.lang = "am-ET";
    const r2 = run(second);
    await r2.ended;
    expect(browserStarted).toHaveBeenCalledWith("am-ET");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("abort throws the recording away", async () => {
    const fetch = vi.fn();
    let finish: (r: Awaited<ReturnType<UtteranceCapture["start"]>>) => void = () => {};
    const capture: UtteranceCapture = {
      start: () => new Promise((resolve) => (finish = resolve)),
      stop: vi.fn(),
      abort: vi.fn(() => finish({ error: "aborted" })),
    };
    const rec = new HybridSpeechRecognition({
      createCapture: () => capture,
      fetch,
      browserRecognition: undefined,
    });
    const r = run(rec);
    rec.abort();
    await r.ended;
    expect(fetch).not.toHaveBeenCalled();
    expect(r.events).toEqual(["start", "end"]);
  });

  it("says plainly when the device can neither record nor recognise", async () => {
    const r = run(
      new HybridSpeechRecognition({
        createCapture: () => null,
        fetch: vi.fn(),
        browserRecognition: undefined,
      }),
    );
    await r.ended;
    expect(r.error()?.error).toBe("not-supported");
  });
});
