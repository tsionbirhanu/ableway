import { describe, expect, it } from "vitest";
import {
  detectAudioFormat,
  MAX_AUDIO_BYTES,
  pcmWavSeconds,
  telegramVoiceToWav,
  toProviderWav,
  toTelegramVoice,
} from "@/lib/speech/audio";
import { SpeechError } from "@/lib/speech/types";
import { containsAscii, toneWav, toOggOpus, toWebm } from "./fixtures";

// These tests run the real ffmpeg (bundled by ffmpeg-static).

const expectSpeechError = async (run: Promise<unknown>, code: string) => {
  await expect(run).rejects.toBeInstanceOf(SpeechError);
  await expect(run).rejects.toMatchObject({ code });
};

describe("detectAudioFormat", () => {
  it("recognises webm, ogg and wav by their first bytes", async () => {
    const wav = toneWav(0.5);
    expect(detectAudioFormat(wav)).toBe("wav");
    expect(detectAudioFormat(await toWebm(wav))).toBe("webm");
    expect(detectAudioFormat(await toOggOpus(wav))).toBe("ogg");
  });

  it("rejects anything else, whatever the file is called", () => {
    expect(detectAudioFormat(new TextEncoder().encode("<html>not audio</html>"))).toBeNull();
    expect(detectAudioFormat(new Uint8Array([0xff, 0xfb, 0x90, 0x00]))).toBeNull(); // mp3
    expect(detectAudioFormat(new Uint8Array())).toBeNull();
  });
});

describe("toProviderWav", () => {
  it.each([
    ["wav (44.1 kHz)", async () => toneWav(2, 44_100)],
    ["webm/opus (browser recording)", async () => toWebm(toneWav(2))],
    ["ogg/opus (Telegram voice note)", async () => toOggOpus(toneWav(2))],
  ])(
    "converts %s to 16 kHz mono WAV and measures it",
    async (_name, make) => {
      const { wav, seconds } = await toProviderWav(await make());
      expect(detectAudioFormat(wav)).toBe("wav");
      const view = new DataView(wav.buffer, wav.byteOffset);
      expect(view.getUint16(22, true)).toBe(1); // mono
      expect(view.getUint32(24, true)).toBe(16_000);
      expect(seconds).toBeGreaterThan(1.8);
      expect(seconds).toBeLessThan(2.2);
      expect(pcmWavSeconds(wav)).toBeCloseTo(seconds);
    },
    30_000,
  );

  it("refuses recordings longer than 60 seconds", async () => {
    await expectSpeechError(toProviderWav(toneWav(61.5, 8_000)), "audio_too_long");
  }, 30_000);

  it("accepts a recording just under 60 seconds", async () => {
    const { seconds } = await toProviderWav(toneWav(59, 8_000));
    expect(seconds).toBeCloseTo(59, 0);
  }, 30_000);

  it("refuses files over 10 MB before decoding them", async () => {
    const huge = new Uint8Array(MAX_AUDIO_BYTES + 1);
    huge.set(toneWav(0.1).subarray(0, 12));
    await expectSpeechError(toProviderWav(huge), "audio_too_large");
  });

  it("refuses empty uploads, other formats, and broken files", async () => {
    await expectSpeechError(toProviderWav(new Uint8Array()), "no_audio");
    await expectSpeechError(toProviderWav(new TextEncoder().encode("hello")), "unsupported_format");
    const fakeOgg = new Uint8Array([...new TextEncoder().encode("OggS"), ...new Uint8Array(200)]);
    await expectSpeechError(toProviderWav(fakeOgg), "unsupported_format");
  });
});

describe("Telegram voice notes", () => {
  it("converts a voice note to WAV for the provider", async () => {
    const { wav, seconds } = await telegramVoiceToWav(await toOggOpus(toneWav(1.5)));
    expect(detectAudioFormat(wav)).toBe("wav");
    expect(seconds).toBeCloseTo(1.5, 0);
  }, 30_000);

  it("converts a spoken reply back to an OGG/Opus voice note", async () => {
    const voice = await toTelegramVoice(toneWav(1));
    expect(detectAudioFormat(voice)).toBe("ogg");
    expect(containsAscii(voice, "OpusHead")).toBe(true);
    // And it is still the same length when decoded.
    const { seconds } = await toProviderWav(voice);
    expect(seconds).toBeCloseTo(1, 0);
  });
});
