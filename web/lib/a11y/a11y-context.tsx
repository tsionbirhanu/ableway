"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AccessibilityPreferences, ContrastTheme, InteractionMode, TextSize } from "@/types/a11y";
import { earcons } from "../audio/earcons";
import { speechSynthesizer } from "../audio/speech-synthesis";

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  interactionMode: "voice-first",
  suppressInAppTTS: false,
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  selectedVoice: null,
  contrastTheme: "default",
  textSize: "normal",
  reducedMotion: false,
  earconsEnabled: true,
  language: "en",
};

interface A11yContextType {
  preferences: AccessibilityPreferences;
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  theme: ContrastTheme;
  setTheme: (theme: ContrastTheme) => void;
  setContrastTheme: (theme: ContrastTheme) => void;
  fontSize: TextSize;
  setFontSize: (size: TextSize) => void;
  setTextSize: (size: TextSize) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  increaseSpeechRate: () => void;
  decreaseSpeechRate: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
  selectedVoice: string | null;
  setSelectedVoice: (voice: string | null) => void;
  availableVoices: SpeechSynthesisVoice[];
  saveSettings: (newPrefs: Partial<AccessibilityPreferences>) => Promise<void>;
  speak: (text: string, force?: boolean) => Promise<void>;
  stopSpeaking: () => void;
  announce: (message: string, politeness?: "polite" | "assertive") => void;
  lastAnnouncement: string | null;
  assertiveAnnouncement: string | null;
}

const A11yContext = createContext<A11yContextType | undefined>(undefined);

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available speech voices in browser
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Load stored preferences after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ableway_a11y_preferences");
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreferences((prev) => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  // Sync state to document classes, HTML lang, and localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("ableway_a11y_preferences", JSON.stringify(preferences));
    } catch {
      // Storage error
    }

    earcons.setEnabled(preferences.earconsEnabled);

    const root = document.documentElement;
    root.setAttribute("lang", preferences.language ? preferences.language.slice(0, 2) : "en");
    root.classList.remove(
      "theme-high-contrast",
      "theme-dark-contrast",
      "theme-yellow-black",
      "text-large",
      "text-x-large",
      "text-xx-large",
      "motion-reduce"
    );

    if (preferences.contrastTheme !== "default") {
      root.classList.add(`theme-${preferences.contrastTheme}`);
    }
    if (preferences.textSize !== "normal") {
      root.classList.add(`text-${preferences.textSize}`);
    }
    if (preferences.reducedMotion) {
      root.classList.add("motion-reduce");
    }
  }, [preferences]);

  const saveSettings = useCallback(async (newPrefs: Partial<AccessibilityPreferences>) => {
    setPreferences((prev) => {
      const updated = {
        ...prev,
        ...newPrefs,
        suppressInAppTTS:
          (newPrefs.interactionMode ?? prev.interactionMode) === "screen-reader",
      };
      // Send to server API to persist in cookies & profile
      fetch("/api/profile/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch((e) => console.warn("Failed to persist settings API:", e));

      return updated;
    });
  }, []);

  const setInteractionMode = useCallback((mode: InteractionMode) => {
    saveSettings({ interactionMode: mode });
  }, [saveSettings]);

  const setContrastTheme = useCallback((theme: ContrastTheme) => {
    saveSettings({ contrastTheme: theme });
  }, [saveSettings]);

  const setTextSize = useCallback((size: TextSize) => {
    saveSettings({ textSize: size });
  }, [saveSettings]);

  const setSpeechRate = useCallback((rate: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, rate));
    saveSettings({ speechRate: clamped });
  }, [saveSettings]);

  const setLanguage = useCallback((lang: string) => {
    saveSettings({ language: lang });
  }, [saveSettings]);

  const setReducedMotion = useCallback((reduced: boolean) => {
    saveSettings({ reducedMotion: reduced });
  }, [saveSettings]);

  const setSelectedVoice = useCallback((voice: string | null) => {
    saveSettings({ selectedVoice: voice });
  }, [saveSettings]);

  const increaseSpeechRate = useCallback(() => {
    setPreferences((prev) => {
      const newRate = Math.min(2.0, +(prev.speechRate + 0.15).toFixed(2));
      saveSettings({ speechRate: newRate });
      return { ...prev, speechRate: newRate };
    });
  }, [saveSettings]);

  const decreaseSpeechRate = useCallback(() => {
    setPreferences((prev) => {
      const newRate = Math.max(0.5, +(prev.speechRate - 0.15).toFixed(2));
      saveSettings({ speechRate: newRate });
      return { ...prev, speechRate: newRate };
    });
  }, [saveSettings]);

  const announce = useCallback((message: string, politeness: "polite" | "assertive" = "polite") => {
    if (politeness === "assertive") {
      setAssertiveAnnouncement(message);
    } else {
      setLastAnnouncement(message);
    }
  }, []);

  const speak = useCallback(
    async (text: string, force: boolean = false) => {
      if (preferences.suppressInAppTTS && !force) {
        announce(text);
        return;
      }

      announce(text);
      await speechSynthesizer.speak(text, {
        rate: preferences.speechRate,
        pitch: preferences.speechPitch,
        volume: preferences.speechVolume,
        lang: preferences.language,
      });
    },
    [preferences, announce]
  );

  const stopSpeaking = useCallback(() => {
    speechSynthesizer.stop();
  }, []);

  return (
    <A11yContext.Provider
      value={{
        preferences,
        mode: preferences.interactionMode,
        setMode: setInteractionMode,
        setInteractionMode,
        theme: preferences.contrastTheme,
        setTheme: setContrastTheme,
        setContrastTheme,
        fontSize: preferences.textSize,
        setFontSize: setTextSize,
        setTextSize,
        speechRate: preferences.speechRate,
        setSpeechRate,
        increaseSpeechRate,
        decreaseSpeechRate,
        language: preferences.language,
        setLanguage,
        reducedMotion: preferences.reducedMotion,
        setReducedMotion,
        selectedVoice: preferences.selectedVoice,
        setSelectedVoice,
        availableVoices,
        saveSettings,
        speak,
        stopSpeaking,
        announce,
        lastAnnouncement,
        assertiveAnnouncement,
      }}
    >
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y() {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error("useA11y must be used within an A11yProvider");
  }
  return context;
}
