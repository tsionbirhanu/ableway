// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { A11yProvider } from "@/lib/a11y/a11y-context";
import { AssistantProvider, useAssistant } from "@/lib/assistant/assistant-context";
import { WebAssistantPanel } from "@/components/assistant/web-assistant-panel";
import { speechSynthesizer } from "@/lib/audio/speech-synthesis";

// Mock speechSynthesizer
vi.spyOn(speechSynthesizer, "speak").mockImplementation(async () => {});
vi.spyOn(speechSynthesizer, "stop").mockImplementation(() => {});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/courses",
}));

// Mock Audio element
class MockAudio {
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockImplementation(async () => {
    setTimeout(() => this.onended?.(), 10);
  });
  pause = vi.fn();
}
global.Audio = MockAudio as unknown as typeof Audio;

// Helper component that registers a mock action requiring confirmation
function PageWithRegisteredAction() {
  const { registerAction } = useAssistant();

  React.useEffect(() => {
    registerAction({
      name: "selectCourse",
      description: "Enroll in course",
      requiresConfirmation: true,
      confirmationPrompt:
        "Are you sure you want to enroll in Digital Accessibility? This will submit your registration.",
      announcement: "Enrolling in course.",
      handler: vi.fn(),
    });
  }, [registerAction]);

  return <div data-testid="page-content">Course Page Content</div>;
}

// Wrapper for tests
function TestWrapper({
  mode = "voice",
  children,
}: {
  mode?: "voice" | "screen-reader" | "hybrid";
  children: React.ReactNode;
}) {
  return (
    <A11yProvider>
      <AssistantProvider initialMode={mode}>
        {children}
        <WebAssistantPanel />
      </AssistantProvider>
    </A11yProvider>
  );
}

describe("Assistant Voice Flow, Accessibility, and Action Rules (F0)", () => {
  let originalFetch: typeof global.fetch;
  let speakSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalFetch = global.fetch;
    speakSpy = vi.spyOn(speechSynthesizer, "speak").mockImplementation(async () => {});
    vi.spyOn(speechSynthesizer, "stop").mockImplementation(() => {});

    // Default mock fetch
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();

      if (urlStr.includes("/api/speech/transcribe")) {
        return new Response(
          JSON.stringify({ transcript: "Help me find a course", confidence: 0.95 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (urlStr.includes("/api/assistant")) {
        return new Response(
          JSON.stringify({
            reply: "Here are the available courses on Ableway.",
            spokenReply: "Here are the available courses.",
            actions: [],
            escalate: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (urlStr.includes("/api/speech/synthesize")) {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "audio/wav" },
        });
      }

      if (urlStr.includes("/api/help")) {
        return new Response(
          JSON.stringify({
            id: "REQ-456",
            status: "pending",
            message: "A human helper will contact you soon.",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Not found", { status: 404 });
    });
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
  });

  it("renders the persistent assistant button with accessible label and opens the panel", () => {
    render(
      <TestWrapper>
        <div>Test Page</div>
      </TestWrapper>,
    );

    const triggerBtn = screen.getByRole("button", { name: /ableway assistant/i });
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn).toHaveAttribute("aria-expanded", "false");

    // Open panel
    fireEvent.click(triggerBtn);
    expect(triggerBtn).toHaveAttribute("aria-expanded", "true");

    // Panel is labelled "Assistant" (non-modal region)
    const panel = screen.getByRole("region", { name: /^assistant$/i });
    expect(panel).toBeInTheDocument();

    // Contains transcript log with role="log"
    const transcriptLog = screen.getByRole("log", { name: /assistant conversation history/i });
    expect(transcriptLog).toBeInTheDocument();

    // Contains visible label for text input
    const inputLabel = screen.getByText(/message the assistant/i);
    expect(inputLabel).toBeInTheDocument();
    const textInput = screen.getByLabelText(/message the assistant/i);
    expect(textInput).toBeInTheDocument();

    // Contains Speak push-to-talk button, Stop speaking, Repeat, and Call a person
    expect(screen.getByRole("button", { name: /^speak/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop speaking/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /repeat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /call a person/i })).toBeInTheDocument();
  });

  it("voice flow: sends text to /api/assistant and speaks reply in Voice mode", async () => {
    render(
      <TestWrapper mode="voice">
        <div>Test Page</div>
      </TestWrapper>,
    );

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: /ableway assistant/i }));

    const textInput = screen.getByLabelText(/message the assistant/i);
    fireEvent.change(textInput, { target: { value: "Show courses" } });

    const sendBtn = screen.getByRole("button", { name: /send message to assistant/i });
    fireEvent.click(sendBtn);

    // Verify /api/assistant was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/assistant",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Show courses"),
        }),
      );
    });

    // In Voice mode, /api/speech/synthesize is called for audio
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/speech/synthesize",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    // Transcript log contains reply
    expect(
      await screen.findByText(/here are the available courses on ableway/i),
    ).toBeInTheDocument();
  });

  it("Rule 20 (Silence in Screen reader mode): never speaks audio or calls synthesize in Screen reader mode", async () => {
    render(
      <TestWrapper mode="screen-reader">
        <div>Screen Reader Mode Page</div>
      </TestWrapper>,
    );

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: /ableway assistant/i }));

    // Send a message
    const textInput = screen.getByLabelText(/message the assistant/i);
    fireEvent.change(textInput, { target: { value: "Show courses" } });
    fireEvent.click(screen.getByRole("button", { name: /send message to assistant/i }));

    // Wait for response to appear in transcript log
    expect(
      await screen.findByText(/here are the available courses on ableway/i),
    ).toBeInTheDocument();

    // Verify /api/speech/synthesize was NEVER called
    const synthesizeCalls = vi
      .mocked(global.fetch)
      .mock.calls.filter((c) => c[0]?.toString().includes("/api/speech/synthesize"));
    expect(synthesizeCalls.length).toBe(0);

    // Verify speechSynthesizer.speak was NEVER called
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it("low-confidence transcripts: asks learner to repeat or spell and NEVER acts on them", async () => {
    // Mock transcribe to return low confidence
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/speech/transcribe")) {
        return new Response(JSON.stringify({ transcript: "enroll in web", confidence: 0.4 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });

    // Mock mediaDevices
    const mockStop = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: mockStop }],
    };
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    // Mock MediaRecorder
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
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;

    render(
      <TestWrapper>
        <PageWithRegisteredAction />
      </TestWrapper>,
    );

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: /ableway assistant/i }));

    // Click Speak button to start recording
    const speakBtn = screen.getByRole("button", { name: /^speak/i });
    fireEvent.click(speakBtn);

    // Wait for microphone permission & recording to start
    const stopBtn = await screen.findByRole("button", { name: /stop listening/i });
    fireEvent.click(stopBtn);

    // Verify the assistant asks to repeat or spell
    expect(
      await screen.findByText(
        /i didn't quite catch that\. could you please repeat or spell that out\?/i,
      ),
    ).toBeInTheDocument();

    // Verify no action confirmation was triggered for 'enroll' because confidence was low
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("actions: shows confirmation dialog before any action that submits data or cannot be undone", async () => {
    // Assistant returns an action that requires confirmation ('selectCourse')
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/assistant")) {
        return new Response(
          JSON.stringify({
            reply: "I will help you enroll.",
            spokenReply: "I will help you enroll.",
            actions: [{ name: "selectCourse", params: { courseId: "course-1" } }],
            escalate: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });

    render(
      <TestWrapper>
        <PageWithRegisteredAction />
      </TestWrapper>,
    );

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: /ableway assistant/i }));

    // Send command
    const textInput = screen.getByLabelText(/message the assistant/i);
    fireEvent.change(textInput, { target: { value: "Enroll in course" } });
    fireEvent.click(screen.getByRole("button", { name: /send message to assistant/i }));

    // Confirmation dialog appears
    const confirmDialog = await screen.findByRole("alertdialog");
    expect(confirmDialog).toBeInTheDocument();
    expect(
      screen.getByText(
        /are you sure you want to enroll in digital accessibility\? this will submit your registration\./i,
      ),
    ).toBeInTheDocument();

    // Confirm button and Cancel button exist
    const confirmBtn = screen.getByRole("button", { name: /confirm action/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel action/i });
    expect(confirmBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    // User can cancel
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("escalation: when response includes escalate, says why, calls POST /api/help, and shows status", async () => {
    // Assistant returns escalate flag
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/assistant")) {
        return new Response(
          JSON.stringify({
            reply: "Connecting you with human support.",
            spokenReply: "Connecting you with a person now.",
            actions: [],
            escalate: true,
            escalateReason: "Learner requested human assistance",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (urlStr.includes("/api/help")) {
        return new Response(
          JSON.stringify({
            id: "REQ-999",
            status: "pending",
            message: "A human helper will contact you soon.",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });

    render(
      <TestWrapper>
        <div>Test Page</div>
      </TestWrapper>,
    );

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: /ableway assistant/i }));

    // Send help message
    const textInput = screen.getByLabelText(/message the assistant/i);
    fireEvent.change(textInput, { target: { value: "I need a human agent" } });
    fireEvent.click(screen.getByRole("button", { name: /send message to assistant/i }));

    // Verify /api/help was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/help",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("human"),
        }),
      );
    });

    // Verify help status banner is displayed
    const helpStatus = await screen.findByRole("status");
    expect(helpStatus).toBeInTheDocument();
    expect(helpStatus).toHaveTextContent(/human helper notified \(req-999\)/i);
  });

  it("failures: if speech or AI fails, says so clearly and offers keyboard or a person", async () => {
    // Assistant endpoint fails with 500
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/assistant")) {
        return new Response("Internal Server Error", { status: 500 });
      }
      return new Response("{}", { status: 200 });
    });

    render(
      <TestWrapper>
        <div>Test Page</div>
      </TestWrapper>,
    );

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: /ableway assistant/i }));

    // Send message
    const textInput = screen.getByLabelText(/message the assistant/i);
    fireEvent.change(textInput, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /send message to assistant/i }));

    // Error alert banner appears
    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(
      /the assistant service is temporarily unavailable\. you can type using your keyboard in the text box below, or select 'call a person'/i,
    );

    // Offers "Use Keyboard" and "Call a Person"
    expect(screen.getByRole("button", { name: /use keyboard/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /call a person/i }).length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
