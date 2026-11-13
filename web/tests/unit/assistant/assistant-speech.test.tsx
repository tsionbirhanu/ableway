// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { A11yProvider } from "@/lib/a11y/a11y-context";
import { AssistantProvider } from "@/lib/assistant/assistant-context";
import { WebAssistantPanel } from "@/components/assistant/web-assistant-panel";
import { speechSynthesizer } from "@/lib/audio/speech-synthesis";

/**
 * How the assistant uses the speech API:
 * - it sends the learner's language with recordings,
 * - it trusts the server's lowConfidence flag (Gemini gives no score),
 * - it reads out the server's error message.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/courses",
}));

class MockAudio {
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockImplementation(async () => {
    setTimeout(() => this.onended?.(), 10);
  });
  pause = vi.fn();
}

class MockMediaRecorder {
  state = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstart: (() => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    this.state = "recording";
    this.onstart?.();
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio data"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

type FetchCall = [RequestInfo | URL, RequestInit | undefined];
let calls: FetchCall[];

function mockFetch(transcribe: Response) {
  calls = [];
  global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push([url, init]);
    const u = url.toString();
    if (u.includes("/api/speech/transcribe")) return transcribe.clone();
    if (u.includes("/api/assistant")) {
      return Response.json({ reply: "Here are the courses.", actions: [], escalate: false });
    }
    if (u.includes("/api/speech/synthesize")) {
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } });
    }
    return Response.json({});
  }) as typeof fetch;
}

async function speakOnce() {
  render(
    <A11yProvider>
      <AssistantProvider initialMode="voice">
        <WebAssistantPanel />
      </AssistantProvider>
    </A11yProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /ableway assistant/i }));
  fireEvent.click(screen.getByRole("button", { name: /^speak/i }));
  fireEvent.click(await screen.findByRole("button", { name: /stop listening/i }));
}

const sentTo = (path: string) => calls.filter(([url]) => url.toString().includes(path));

beforeEach(() => {
  vi.spyOn(speechSynthesizer, "speak").mockImplementation(async () => {});
  vi.spyOn(speechSynthesizer, "stop").mockImplementation(() => {});
  global.Audio = MockAudio as unknown as typeof Audio;
  (window as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("assistant speech", () => {
  it("sends the learner's language with the recording", async () => {
    mockFetch(
      Response.json({ transcript: "Show courses", confidence: 0.95, lowConfidence: false }),
    );
    await speakOnce();
    await waitFor(() => expect(sentTo("/api/speech/transcribe")).toHaveLength(1));
    const body = sentTo("/api/speech/transcribe")[0]![1]!.body as FormData;
    expect(body.get("language")).toBe("en");
    expect(body.get("audio")).toBeInstanceOf(Blob);
  });

  it("acts on a transcript with no confidence score when the server says it is fine (Gemini)", async () => {
    mockFetch(
      Response.json({ transcript: "Show courses", confidence: null, lowConfidence: false }),
    );
    await speakOnce();
    await waitFor(() => expect(sentTo("/api/assistant").length).toBeGreaterThan(0));
    expect(screen.queryByText(/didn't quite catch that/i)).not.toBeInTheDocument();
  });

  it("asks to repeat when the server flags low confidence, even with a high score", async () => {
    mockFetch(Response.json({ transcript: "enroll me", confidence: 0.99, lowConfidence: true }));
    await speakOnce();
    expect(await screen.findByText(/didn't quite catch that/i)).toBeInTheDocument();
    expect(sentTo("/api/assistant")).toHaveLength(0);
  });

  it("reads out the server's plain-language error", async () => {
    mockFetch(
      Response.json(
        {
          error: {
            code: "audio_too_long",
            message: "That recording is too long. Please speak for less than one minute.",
          },
        },
        { status: 413 },
      ),
    );
    await speakOnce();
    expect(await screen.findByText(/please speak for less than one minute/i)).toBeInTheDocument();
  });

  it("sends the language when it speaks a reply", async () => {
    mockFetch(
      Response.json({ transcript: "Show courses", confidence: 0.95, lowConfidence: false }),
    );
    await speakOnce();
    await waitFor(() => expect(sentTo("/api/speech/synthesize").length).toBeGreaterThan(0));
    const body = JSON.parse(String(sentTo("/api/speech/synthesize")[0]![1]!.body));
    expect(body).toMatchObject({ language: "en" });
    expect(typeof body.text).toBe("string");
  });
});
