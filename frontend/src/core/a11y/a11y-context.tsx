"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AccessibilityPreferences, ContrastTheme, InteractionMode, TextSize } from "@/types/a11y";
import { earcons } from "../audio/earcons";
import { speechSynthesizer } from "../audio/speech-synthesis";

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  interactionMode: "voice-first",
  suppressInAppTTS: false,
  speechRate: 0.82, // Slower, clearer speech rate for accessibility
  speechPitch: 1.0,
  speechVolume: 1.0,
  selectedVoice: null,
  contrastTheme: "default",
  textSize: "normal",
  reducedMotion: false,
  earconsEnabled: true,
  language: "en-US",
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
  toggleLanguage: () => void;
  speak: (text: string, force?: boolean) => Promise<void>;
  stopSpeaking: () => void;
  announce: (message: string, politeness?: "polite" | "assertive") => void;
  lastAnnouncement: string | null;
}

const A11yContext = createContext<A11yContextType | undefined>(undefined);

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("ableway_a11y_preferences");
        if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      } catch {
        // Storage unavailable
      }
    }
    return DEFAULT_PREFERENCES;
  });
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);

  // Sync state to localStorage & document classes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("ableway_a11y_preferences", JSON.stringify(preferences));
    } catch {
      // Storage error
    }

    earcons.setEnabled(preferences.earconsEnabled);

    // Apply classes to root element for styling
    const root = document.documentElement;
    root.classList.remove(
      "theme-high-contrast",
      "theme-dark-contrast",
      "theme-yellow-black",
      "text-large",
      "text-x-large",
      "text-xx-large"
    );

    if (preferences.contrastTheme !== "default") {
      root.classList.add(`theme-${preferences.contrastTheme}`);
    }
    if (preferences.textSize !== "normal") {
      root.classList.add(`text-${preferences.textSize}`);
    }
  }, [preferences]);

  const setInteractionMode = useCallback((mode: InteractionMode) => {
    setPreferences((prev) => ({
      ...prev,
      interactionMode: mode,
      // If screen reader mode is picked, suppress internal TTS to avoid clashing voices (FR-2.10)
      suppressInAppTTS: mode === "screen-reader",
    }));
  }, []);

  const setContrastTheme = useCallback((theme: ContrastTheme) => {
    setPreferences((prev) => ({ ...prev, contrastTheme: theme }));
  }, []);

  const setTextSize = useCallback((size: TextSize) => {
    setPreferences((prev) => ({ ...prev, textSize: size }));
  }, []);

  const setSpeechRate = useCallback((rate: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, rate));
    setPreferences((prev) => ({ ...prev, speechRate: clamped }));
  }, []);

  const increaseSpeechRate = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      speechRate: Math.min(2.0, +(prev.speechRate + 0.15).toFixed(2)),
    }));
  }, []);

  const decreaseSpeechRate = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      speechRate: Math.max(0.5, +(prev.speechRate - 0.15).toFixed(2)),
    }));
  }, []);

  const announce = useCallback((message: string, _politeness: "polite" | "assertive" = "polite") => {
    setLastAnnouncement(message);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setPreferences((prev) => ({ ...prev, language: lang }));
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === 'am-ET' ? 'am' : 'en';
    }
    const msg = lang === 'am-ET' ? 'ቋንቋ ወደ አማርኛ ተቀይሯል።' : 'Language set to English.';
    setLastAnnouncement(msg);
  }, []);

  const toggleLanguage = useCallback(() => {
    setPreferences((prev) => {
      const nextLang = prev.language === 'am-ET' ? 'en-US' : 'am-ET';
      if (typeof document !== "undefined") {
        document.documentElement.lang = nextLang === 'am-ET' ? 'am' : 'en';
      }
      const msg = nextLang === 'am-ET' ? 'ቋንቋ ወደ አማርኛ ተቀይሯል።' : 'Language set to English.';
      setLastAnnouncement(msg);
      return { ...prev, language: nextLang };
    });
  }, []);

  const speak = useCallback(
    async (text: string, force: boolean = false) => {
      // If user selected screen reader mode, suppress in-app speech unless forced
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
        toggleLanguage,
        speak,
        stopSpeaking,
        announce,
        lastAnnouncement,
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
