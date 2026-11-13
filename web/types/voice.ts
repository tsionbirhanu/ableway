export type VoiceCommandIntent =
  | "HELP"
  | "WHERE_AM_I"
  | "GO_HOME"
  | "GO_BACK"
  | "REPEAT"
  | "SLOWER"
  | "FASTER"
  | "NEXT_LESSON"
  | "PREVIOUS_LESSON"
  | "ASK_TUTOR"
  | "FIND_JOBS"
  | "APPLY"
  | "GIVE_FEEDBACK"
  | "STOP"
  | "CONFIRM"
  | "CANCEL"
  | "UNKNOWN";

export interface VoiceCommandDefinition {
  intent: VoiceCommandIntent;
  phrases: string[];
  description: string;
  context?: string; // e.g. "global", "lesson", "job", "quiz"
}

export type EarconType =
  | "listening-start"
  | "listening-stop"
  | "command-recognized"
  | "success"
  | "error"
  | "warning"
  | "navigation";

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  lastCommand: VoiceCommandIntent | null;
  confidence: number;
  error: string | null;
}

