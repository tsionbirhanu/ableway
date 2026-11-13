import { mkdtemp, readdir, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { detectAudioFormat } from "@/lib/speech/audio";
import { normalizeLanguage, resolveVoice, speechLanguage } from "@/lib/speech/languages";
import { AzureTextToSpeech } from "@/lib/speech/providers/azure";
import { GeminiTextToSpeech } from "@/lib/speech/providers/gemini";
import { MockSpeechToText, MockTextToSpeech, silentWav } from "@/lib/speech/providers/mock";
import { pruneRetainedAudio, retainAudio } from "@/lib/speech/retention";
import {
  MAX_TTS_CHARS,
  synthesizeSpeech,
  synthesizeTelegramVoice,
  transcribeRecording,
  transcribeTelegramVoice,
  type SpeechDeps,
} from "@/lib/speech/service";
import { TtsCache, ttsCacheKey } from "@/lib/speech/tts-cache";
import { containsAscii, toneWav, toOggOpus, toWebm } from "./fixtures";

function deps(overrides: Partial<SpeechDeps> = {}): SpeechDeps & {
  stt: MockSpeechToText;
  tts: MockTextToSpeech;
} {
  return {
    providerName: "mock",
    stt: new MockSpeechToText(),
    tts: new MockTextToSpeech(),
    cache: new TtsCache(),
    lowConfidenceThreshold: 0.65,
    retention: { enabled: false, dir: "unused", days: 30 },
    ...overrides,
  } as SpeechDeps & { stt: MockSpeechToText; tts: MockTextToSpeech };
}

describe("transcribeRecording", () => {
  it("converts a browser recording and returns text, language and confidence", async () => {
    const d = deps();
    const result = await transcribeRecording(d, await toWebm(toneWav(1)), "am-ET");
    expect(result).toMatchObject({
      text: "Help me find a course",
      language: "am",
      confidence: 0.95,
      lowConfidence: false,
    });
    // The provider always gets 16 kHz WAV, never the raw upload.
    expect(d.stt.calls[0]?.language).toBe("am");
    expect(d.stt.calls[0]?.audioBytes).toBeGreaterThan(30_000);
  });

  it("flags low confidence below the configured threshold", async () => {
    const low = deps({ stt: new MockSpeechToText({ text: "maybe", confidence: 0.4 }) });
    expect((await transcribeRecording(low, toneWav(1), "en")).lowConfidence).toBe(true);

    const strict = deps({
      stt: new MockSpeechToText({ text: "maybe", confidence: 0.8 }),
      lowConfidenceThreshold: 0.9,
    });
    expect((await transcribeRecording(strict, toneWav(1), "en")).lowConfidence).toBe(true);
  });

  it("does not store audio by default", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ableway-retention-off-"));
    await transcribeRecording(
      deps({ retention: { enabled: false, dir, days: 30 } }),
      toneWav(1),
      "en",
    );
    expect(await readdir(dir)).toEqual([]);
  });

  it("stores the converted WAV only when retention is switched on", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ableway-retention-on-"));
    await transcribeRecording(
      deps({ retention: { enabled: true, dir, days: 30 } }),
      toneWav(1),
      "en",
    );
    const files = await readdir(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}_[0-9a-f-]{36}\.wav$/);
  });

  it("transcribes Telegram voice notes the same way", async () => {
    const result = await transcribeTelegramVoice(deps(), await toOggOpus(toneWav(1)), "am");
    expect(result.language).toBe("am");
  });

  it("refuses languages without speech support", async () => {
    await expect(transcribeRecording(deps(), toneWav(1), "om")).rejects.toMatchObject({
      code: "language_not_supported",
    });
  });
});

describe("synthesizeSpeech", () => {
  it("uses the language's default voice and caches repeated phrases", async () => {
    const d = deps();
    const first = await synthesizeSpeech(d, {
      text: "You are on the courses page.",
      language: "en",
    });
    const second = await synthesizeSpeech(d, {
      text: "  You are on the courses page.  ",
      language: "en",
    });
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(d.tts.calls).toHaveLength(1);
    expect(d.tts.calls[0]).toMatchObject({ voice: "mock-en-1", rate: 1 });
    expect(detectAudioFormat(first.audio)).toBe("wav");
  });

  it("caches separately per language, voice and rate", async () => {
    const d = deps();
    await synthesizeSpeech(d, { text: "Hello", language: "en" });
    await synthesizeSpeech(d, { text: "Hello", language: "en", rate: 1.5 });
    await synthesizeSpeech(d, { text: "Hello", language: "en", voice: "mock-en-2" });
    await synthesizeSpeech(d, { text: "Hello", language: "am" });
    expect(d.tts.calls).toHaveLength(4);
  });

  it("limits text to 1,500 characters", async () => {
    await expect(
      synthesizeSpeech(deps(), { text: "a".repeat(MAX_TTS_CHARS + 1) }),
    ).rejects.toMatchObject({ code: "text_too_long" });
    await expect(
      synthesizeSpeech(deps(), { text: "a".repeat(MAX_TTS_CHARS) }),
    ).resolves.toBeTruthy();
  });

  it("refuses empty text and keeps the rate in a safe range", async () => {
    await expect(synthesizeSpeech(deps(), { text: "   " })).rejects.toMatchObject({
      code: "no_audio",
    });
    const d = deps();
    await synthesizeSpeech(d, { text: "Fast", rate: 9 });
    expect(d.tts.calls[0]?.rate).toBe(2);
  });

  it("makes a Telegram voice note (OGG/Opus) from text", async () => {
    const voice = await synthesizeTelegramVoice(deps(), {
      text: "Here is a new job for you.",
      language: "en",
    });
    expect(detectAudioFormat(voice)).toBe("ogg");
    expect(containsAscii(voice, "OpusHead")).toBe(true);
  });
});

describe("languages", () => {
  it("maps app and locale codes", () => {
    expect(normalizeLanguage("am-ET")).toBe("am");
    expect(normalizeLanguage(undefined)).toBe("en");
    expect(speechLanguage("AM").locale).toBe("am-ET");
    const azure = new AzureTextToSpeech({ key: "k", region: "eastus" });
    expect(resolveVoice(azure, "am", "default")).toBe("am-ET-MekdesNeural");
    expect(resolveVoice(azure, "am", "am-ET-AmehaNeural")).toBe("am-ET-AmehaNeural");
    expect(() => resolveVoice(azure, "en", "am-ET-AmehaNeural")).toThrow(/voice is not available/);
    const gemini = new GeminiTextToSpeech({ key: "k" });
    expect(resolveVoice(gemini, "am", undefined)).toBe("Kore");
    expect(resolveVoice(gemini, "en", "Puck")).toBe("Puck");
    expect(() => resolveVoice(gemini, "en", "en-US-JennyNeural")).toThrow(/voice is not available/);
  });

  it.each(["so", "om", "ti", "xx"])("explains that %s has no speech", (code) => {
    expect(() => speechLanguage(code)).toThrow(/not available in this language/);
  });
});

describe("TtsCache", () => {
  const audio = (bytes: number) => ({ audio: new Uint8Array(bytes), contentType: "audio/wav" });

  it("drops the least recently used entry when full", () => {
    const cache = new TtsCache(2, 1000);
    cache.set("a", audio(10));
    cache.set("b", audio(10));
    cache.get("a");
    cache.set("c", audio(10));
    expect(cache.get("a")).toBeDefined();
    expect(cache.get("b")).toBeUndefined();
    expect(cache.size).toBe(2);
  });

  it("keeps total size under the byte limit", () => {
    const cache = new TtsCache(100, 25);
    cache.set("a", audio(10));
    cache.set("b", audio(10));
    cache.set("c", audio(10));
    expect(cache.totalBytes).toBeLessThanOrEqual(25);
    cache.set("huge", audio(26));
    expect(cache.get("huge")).toBeUndefined();
  });

  it("keys on every input, and never contains the text itself", () => {
    const base = { provider: "azure", text: "Meron Tesfaye", language: "am", voice: "v", rate: 1 };
    const key = ttsCacheKey(base);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("Meron");
    for (const change of [
      { text: "x" },
      { language: "en" },
      { voice: "w" },
      { rate: 1.1 },
      { provider: "mock" },
    ]) {
      expect(ttsCacheKey({ ...base, ...change })).not.toBe(key);
    }
  });
});

describe("pruneRetainedAudio", () => {
  it("deletes retained recordings older than the retention period", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ableway-prune-"));
    const config = { enabled: true, dir, days: 30 };
    const old = await retainAudio(config, silentWav(0.1));
    await retainAudio(config, silentWav(0.1));
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await utimes(join(dir, old!), fortyDaysAgo, fortyDaysAgo);

    expect(await pruneRetainedAudio(config)).toBe(1);
    expect(await readdir(dir)).toHaveLength(1);
  });

  it("does nothing when the folder does not exist", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await pruneRetainedAudio({ enabled: true, dir: join(tmpdir(), "missing-dir-xyz"), days: 1 }),
    ).toBe(0);
  });
});
