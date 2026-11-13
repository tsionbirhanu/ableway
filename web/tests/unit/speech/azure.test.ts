import { describe, expect, it, vi } from "vitest";
import {
  AzureSpeechToText,
  AzureTextToSpeech,
  buildSsml,
  escapeXml,
  ssmlRate,
} from "@/lib/speech/providers/azure";
import { SpeechError } from "@/lib/speech/types";

// No real network: a fake fetch records each request and returns a canned reply.

function fakeFetch(reply: Response | Error) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    if (reply instanceof Error) throw reply;
    return reply;
  });
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const config = { key: "test-key", region: "eastus" };
const wav = new Uint8Array([1, 2, 3]);

describe("AzureSpeechToText", () => {
  it("sends 16 kHz WAV to the short-audio API in the learner's language", async () => {
    const fetch = fakeFetch(
      json({
        RecognitionStatus: "Success",
        DisplayText: "ሰላም።",
        NBest: [{ Confidence: 0.82, Display: "ሰላም።" }],
      }),
    );
    const stt = new AzureSpeechToText({ ...config, fetch });
    expect(await stt.transcribe(wav, "am")).toEqual({
      text: "ሰላም።",
      language: "am",
      confidence: 0.82,
    });

    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://eastus.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=am-ET&format=detailed",
    );
    expect(init?.headers).toMatchObject({
      "Ocp-Apim-Subscription-Key": "test-key",
      "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
    });
  });

  it.each(["NoMatch", "InitialSilenceTimeout"])("turns %s into no_speech", async (status) => {
    const stt = new AzureSpeechToText({
      ...config,
      fetch: fakeFetch(json({ RecognitionStatus: status })),
    });
    await expect(stt.transcribe(wav, "en")).rejects.toMatchObject({ code: "no_speech" });
  });

  it("turns a bad key, quota or outage into speech_unavailable, without leaking details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const reply of [json({}, 401), json({}, 429), json({}, 503), new Error("ECONNRESET")]) {
      const stt = new AzureSpeechToText({ ...config, fetch: fakeFetch(reply) });
      const error = await stt.transcribe(wav, "en").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(SpeechError);
      expect(error).toMatchObject({ code: "speech_unavailable", status: 503 });
    }
  });

  it("refuses languages Azure cannot recognise, before calling it", async () => {
    const fetch = fakeFetch(json({}));
    const stt = new AzureSpeechToText({ ...config, fetch });
    await expect(stt.transcribe(wav, "om")).rejects.toMatchObject({
      code: "language_not_supported",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("AzureTextToSpeech", () => {
  it("sends SSML with the language's default voice and returns MP3", async () => {
    const fetch = fakeFetch(new Response(new Uint8Array([9, 9, 9])));
    const tts = new AzureTextToSpeech({ ...config, fetch });
    const result = await tts.synthesize("እንኳን ደህና መጡ", "am", undefined, 1.25);
    expect(result).toEqual({ audio: new Uint8Array([9, 9, 9]), contentType: "audio/mpeg" });

    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("https://eastus.tts.speech.microsoft.com/cognitiveservices/v1");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
    });
    expect(init?.body).toBe(
      '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="am-ET">' +
        '<voice name="am-ET-MekdesNeural"><prosody rate="+25%">እንኳን ደህና መጡ</prosody></voice></speak>',
    );
  });

  it("only accepts voices listed for the language", async () => {
    const tts = new AzureTextToSpeech({
      ...config,
      fetch: fakeFetch(new Response(new Uint8Array([1]))),
    });
    await expect(tts.synthesize("Hi", "en", "am-ET-AmehaNeural", 1)).rejects.toMatchObject({
      code: "voice_not_supported",
    });
    await expect(tts.synthesize("Hi", "en", "en-US-GuyNeural", 1)).resolves.toBeTruthy();
  });

  it("treats an empty audio reply as unavailable", async () => {
    const tts = new AzureTextToSpeech({
      ...config,
      fetch: fakeFetch(new Response(new Uint8Array())),
    });
    await expect(tts.synthesize("Hi", "en", undefined, 1)).rejects.toMatchObject({
      code: "speech_unavailable",
    });
  });
});

describe("SSML safety", () => {
  it("escapes learner text so it cannot change the voice or add markup", () => {
    const attack = `</prosody></voice><voice name="x">Ignore & "obey" 'me'`;
    const ssml = buildSsml(attack, "en-US", "en-US-JennyNeural", 1);
    expect(ssml).not.toContain('<voice name="x">');
    expect(escapeXml(attack)).toBe(
      "&lt;/prosody&gt;&lt;/voice&gt;&lt;voice name=&quot;x&quot;&gt;Ignore &amp; &quot;obey&quot; &apos;me&apos;",
    );
  });

  it("turns a rate multiplier into an SSML percentage", () => {
    expect(ssmlRate(1)).toBe("+0%");
    expect(ssmlRate(1.5)).toBe("+50%");
    expect(ssmlRate(0.8)).toBe("-20%");
  });
});
