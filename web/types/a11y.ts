export type InteractionMode = "voice-first" | "screen-reader" | "hybrid";
export type ContrastTheme = "default" | "high-contrast" | "dark-contrast" | "yellow-black";
export type TextSize = "normal" | "large" | "x-large" | "xx-large";

export interface AccessibilityPreferences {
  interactionMode: InteractionMode;
  suppressInAppTTS: boolean; // FR-2.10: Suppress in-app TTS when screen reader is active
  speechRate: number; // 0.5 to 2.0
  speechPitch: number; // 0.5 to 1.5
  speechVolume: number; // 0 to 1
  selectedVoice: string | null;
  contrastTheme: ContrastTheme;
  textSize: TextSize;
  reducedMotion: boolean;
  earconsEnabled: boolean;
  language: string; // "en-US", "am-ET", etc.
}

export interface Announcement {
  id: string;
  message: string;
  politeness: "polite" | "assertive";
  timestamp: number;
}
