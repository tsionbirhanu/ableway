// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import "@testing-library/jest-dom/vitest";
import "./vitest-axe.d.ts";
import HomePage from "@/app/page";

expect.extend(matchers);

// Mock A11y Context
const mockAnnounce = vi.fn();
const mockSetLanguage = vi.fn();
let currentLanguage = "en-US";

vi.mock("@/lib/a11y/a11y-context", () => ({
  useA11y: () => ({
    language: currentLanguage,
    setLanguage: mockSetLanguage,
    mode: "voice-first",
    announce: mockAnnounce,
    speechRate: 0.82,
  }),
}));

// Mock Audio
vi.mock("@/lib/audio/earcons", () => ({
  playEarcon: vi.fn(),
}));

const mockSpeak = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();

vi.mock("@/lib/audio/speech-synthesis", () => ({
  speechSynthesizer: {
    speak: (...args: unknown[]) => mockSpeak(...args),
    stop: () => mockStop(),
    getVoices: () => [],
    isSpeaking: () => false,
  },
}));

describe("Welcome Page Multilingual Options & Voice Assistance (F0 Compliance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    currentLanguage = "en-US";
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the dedicated multilingual section and all 4 language options", () => {
    render(<HomePage />);

    const langHeading = screen.getByRole("heading", {
      name: /choose your language/i,
    });
    expect(langHeading).toBeInTheDocument();

    // 4 Language Buttons
    expect(screen.getByRole("button", { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /አማርኛ/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /afaan oromoo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ትግርኛ/i })).toBeInTheDocument();
  });

  it("speaks and announces language options automatically when website pops out", async () => {
    render(<HomePage />);

    // Fast-forward mount timer and flush async speech steps
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Polite live region announcement
    expect(mockAnnounce).toHaveBeenCalledWith(
      expect.stringContaining("Welcome to Ableway! Please choose your preferred language"),
      "polite",
    );

    // Spoken voice guidance
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining("Welcome to Ableway! Please choose your language"),
      expect.objectContaining({ lang: "en-US" }),
    );

    // Spoken Amharic prompt
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining("ወይም አማርኛ ለመምረጥ 2ን ይጫኑ።"),
      expect.objectContaining({ lang: "am-ET" }),
    );
  });

  it("switches to Amharic when clicking the Amharic button", () => {
    render(<HomePage />);

    const amharicBtn = screen.getByRole("button", { name: /አማርኛ/i });
    fireEvent.click(amharicBtn);

    expect(mockSetLanguage).toHaveBeenCalledWith("am-ET");
    expect(mockAnnounce).toHaveBeenCalledWith(
      expect.stringContaining("ቋንቋ ወደ አማርኛ ተቀይሯል።"),
      "polite",
    );
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining("ወደ ኤብልዌይ በደህና መጡ"),
      expect.objectContaining({ lang: "am-ET" }),
    );
  });

  it("supports single-key number shortcuts (1, 2, 3, 4) to switch language", () => {
    render(<HomePage />);

    // Press key 2 for Amharic
    fireEvent.keyDown(window, { key: "2" });
    expect(mockSetLanguage).toHaveBeenCalledWith("am-ET");

    // Press key 1 for English
    fireEvent.keyDown(window, { key: "1" });
    expect(mockSetLanguage).toHaveBeenCalledWith("en-US");

    // Press key 3 for Afaan Oromoo
    fireEvent.keyDown(window, { key: "3" });
    expect(mockSetLanguage).toHaveBeenCalledWith("om-ET");

    // Press key 4 for Tigrinya
    fireEvent.keyDown(window, { key: "4" });
    expect(mockSetLanguage).toHaveBeenCalledWith("ti-ET");
  });

  it('re-plays speech when "Hear Options Aloud" button is clicked', () => {
    render(<HomePage />);

    const hearBtn = screen.getByRole("button", { name: /hear language options spoken aloud/i });
    fireEvent.click(hearBtn);

    expect(mockAnnounce).toHaveBeenCalledWith(
      expect.stringContaining("Welcome to Ableway! Please choose your preferred language"),
      "polite",
    );
    expect(mockSpeak).toHaveBeenCalled();
  });

  it("passes axe accessibility audit across all 3 themes", async () => {
    vi.useRealTimers();
    const themes = ["theme-default", "theme-high-contrast", "text-large"];

    for (const themeClass of themes) {
      const { container } = render(
        <div className={themeClass}>
          <HomePage />
        </div>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      cleanup();
    }
  });
});
