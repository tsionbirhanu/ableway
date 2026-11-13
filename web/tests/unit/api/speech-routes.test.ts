import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/auth/rate-limit";
import { resetEnvCacheForTests } from "@/lib/env";
import { setSpeechProvidersForTests } from "@/lib/speech";
import { MockSpeechToText, MockTextToSpeech } from "@/lib/speech/providers/mock";
import { createTestDb, type TestDb } from "../db/test-db";
import { createAuthFixtures, type AuthFixtures } from "../helpers/auth-fixtures";
import { toneWav, toWebm } from "../speech/fixtures";

/** Real route handlers and ffmpeg; mock speech provider; PGlite for rate limits. */
const state = vi.hoisted(() => ({ userId: null as string | null, db: null as unknown }));
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(async () => (state.userId ? { user: { id: state.userId } } : null)),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => state.db }));

const transcribeRoute = await import("@/app/api/speech/transcribe/route");
const synthesizeRoute = await import("@/app/api/speech/synthesize/route");

const env = {
  DATABASE_URL: "postgresql://test:test@localhost/test",
  AUTH_SECRET: "x".repeat(32),
  CRON_SECRET: "y".repeat(16),
  TELEGRAM_WEBHOOK_SECRET: "z".repeat(16),
  APP_URL: "http://localhost:3000",
  SPEECH_PROVIDER: "mock",
};

let t: TestDb;
let f: AuthFixtures;
let stt: MockSpeechToText;
let tts: MockTextToSpeech;
let ipCounter = 0;
const freshIp = () => `203.0.113.${++ipCounter}`;

beforeAll(async () => {
  t = await createTestDb();
  state.db = t.db;
  f = await createAuthFixtures(t.db);
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

beforeEach(() => {
  state.userId = null;
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  resetEnvCacheForTests();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  stt = new MockSpeechToText();
  tts = new MockTextToSpeech();
  setSpeechProvidersForTests({ name: "mock", stt, tts });
});

function upload(audio: Uint8Array, opts: { language?: string; ip?: string; field?: string } = {}) {
  const form = new FormData();
  form.append(
    opts.field ?? "audio",
    new Blob([Buffer.from(audio)], { type: "audio/webm" }),
    "recording.webm",
  );
  if (opts.language) form.append("language", opts.language);
  return transcribeRoute.POST(
    new Request("http://test.local/api/speech/transcribe", {
      method: "POST",
      body: form,
      headers: { "x-real-ip": opts.ip ?? freshIp() },
    }),
  );
}

function speak(body: unknown, ip = freshIp()) {
  return synthesizeRoute.POST(
    new Request("http://test.local/api/speech/synthesize", {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": ip },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/speech/transcribe", () => {
  it("transcribes a browser recording (the shape the assistant panel reads)", async () => {
    const res = await upload(await toWebm(toneWav(1.5)), { language: "am" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      text: "Help me find a course",
      transcript: "Help me find a course",
      language: "am",
      confidence: 0.95,
      lowConfidence: false,
      seconds: 1.5,
    });
  });

  it("accepts a raw audio body with ?language=", async () => {
    const res = await transcribeRoute.POST(
      new Request("http://test.local/api/speech/transcribe?language=am", {
        method: "POST",
        headers: { "content-type": "audio/wav", "x-real-ip": freshIp() },
        body: Buffer.from(toneWav(1)),
      }),
    );
    expect((await res.json()).language).toBe("am");
  });

  it("flags low confidence so the frontend asks the learner to repeat", async () => {
    setSpeechProvidersForTests({
      name: "mock",
      stt: new MockSpeechToText({ text: "uh", confidence: 0.3 }),
      tts,
    });
    const body = await (await upload(toneWav(1))).json();
    expect(body.lowConfidence).toBe(true);
  });

  it.each([
    ["no audio field", () => upload(toneWav(1), { field: "other" }), 400, "no_audio"],
    [
      "not audio",
      () => upload(new TextEncoder().encode("not audio at all")),
      415,
      "unsupported_format",
    ],
    ["over 60 seconds", () => upload(toneWav(61.5, 8_000)), 413, "audio_too_long"],
    [
      "unsupported language",
      () => upload(toneWav(1), { language: "om" }),
      422,
      "language_not_supported",
    ],
  ])("returns a clear JSON error for %s", async (_name, call, status, code) => {
    const res = await call();
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.error.code).toBe(code);
    // A short sentence the frontend can read aloud.
    expect(body.error.message).toMatch(/^[A-Z].*\.$/);
  });

  it("refuses a request that says it is over 10 MB, before reading it", async () => {
    const res = await transcribeRoute.POST(
      new Request("http://test.local/api/speech/transcribe", {
        method: "POST",
        headers: { "content-type": "audio/wav", "content-length": String(11 * 1024 * 1024) },
        body: "x",
      }),
    );
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("audio_too_large");
  });

  it("rate limits per signed-in learner, across IPs", async () => {
    state.userId = f.learnerA.id;
    const audio = toneWav(0.3);
    for (let i = 0; i < LIMITS.speechTranscribe.max; i++)
      expect((await upload(audio)).status).toBe(200);
    const blocked = await upload(audio);
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.message).toMatch(/wait a few minutes/);

    // Another learner is not affected.
    state.userId = f.learnerB.id;
    expect((await upload(audio)).status).toBe(200);
  }, 60_000);

  it("rate limits by IP before sign-in", async () => {
    const ip = "198.51.100.200";
    const audio = toneWav(0.3);
    for (let i = 0; i < LIMITS.speechTranscribe.max; i++) await upload(audio, { ip });
    expect((await upload(audio, { ip })).status).toBe(429);
  }, 60_000);
});

describe("POST /api/speech/synthesize", () => {
  it("returns audio and caches repeated phrases", async () => {
    const first = await speak({ text: "You are on the courses page.", rate: 1.2 });
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("audio/wav");
    expect(first.headers.get("x-speech-cache")).toBe("miss");
    expect(first.headers.get("x-speech-provider")).toBe("mock");
    expect((await first.arrayBuffer()).byteLength).toBeGreaterThan(44);

    const second = await speak({ text: "You are on the courses page.", rate: 1.2 });
    expect(second.headers.get("x-speech-cache")).toBe("hit");
  });

  it("speaks Amharic with an Amharic voice", async () => {
    await speak({ text: "እንኳን ደህና መጡ", language: "am" });
    expect(tts.calls.at(-1)).toMatchObject({ language: "am", voice: "mock-am-1" });
  });

  it.each([
    ["text over 1,500 characters", { text: "a".repeat(1501) }, 413, "text_too_long"],
    ["no text", { rate: 1 }, 400, "no_audio"],
    ["an unsupported language", { text: "Akkam", language: "om" }, 422, "language_not_supported"],
    [
      "a voice from another language",
      { text: "Hi", voice: "am-ET-AmehaNeural" },
      422,
      "voice_not_supported",
    ],
  ])("returns a clear JSON error for %s", async (_name, body, status, code) => {
    const res = await speak(body);
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
  });

  it("returns speech_unavailable when the provider fails", async () => {
    setSpeechProvidersForTests({
      name: "broken",
      stt,
      tts: {
        voices: () => ["v"],
        synthesize: async () => {
          const { SpeechError } = await import("@/lib/speech/types");
          throw new SpeechError("speech_unavailable");
        },
      },
    });
    const res = await speak({ text: "Hello there" });
    expect(res.status).toBe(503);
    expect((await res.json()).error.message).toMatch(/type instead, or ask a helper/);
  });
});
