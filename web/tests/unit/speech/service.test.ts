import { describe, expect, it } from "vitest";
import { detectAudioFormat } from "@/lib/speech/audio";
import { normalizeLanguage, resolveVoice, speechLanguage } from "@/lib/speech/languages";
import { AzureTextToSpeech } from "@/lib/speech/providers/azure";
import { GeminiTextToSpeech } from "@/lib/speech/providers/gemini";
import { MockSpeechToText, MockTextToSpeech } from "@/lib/speech/providers/mock";
import type { RecordingOwner, RetentionPolicy } from "@/lib/speech/retention";
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

  it("keeps no audio by default (no retention policy given)", async () => {
    // Nothing to observe except that it works without a policy; the default keeps nothing.
    const result = await transcribeRecording(deps(), toneWav(1), "en");
    expect(result.text).toBeTruthy();
  });

  it("offers the converted WAV and its owner to the retention policy", async () => {
    const seen: { bytes: number; owner: RecordingOwner }[] = [];
    const policy: RetentionPolicy = {
      async retain(wav, owner) {
        seen.push({ bytes: wav.length, owner });
        return false;
      },
    };
    await transcribeRecording(deps({ retention: policy }), toneWav(1), "en", {
      profileId: "p1",
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.owner).toEqual({ profileId: "p1" });
    // 16 kHz mono 16-bit WAV, not the raw upload.
    expect(seen[0]?.bytes).toBeGreaterThan(30_000);
  });

  it("still returns the transcript when keeping the recording fails", async () => {
    const policy: RetentionPolicy = {
      async retain() {
        throw new Error("disk full");
      },
    };
    const result = await transcribeRecording(deps({ retention: policy }), toneWav(1), "en");
    expect(result.text).toBeTruthy();
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
