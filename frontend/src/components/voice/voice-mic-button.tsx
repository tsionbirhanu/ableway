"use client";

import React from "react";
import { Mic, MicOff } from "lucide-react";
import { ScreenReaderOnly } from "../a11y/screen-reader-only";

interface VoiceMicButtonProps {
  isListening: boolean;
  onToggle: () => void;
  className?: string;
  size?: "default" | "large";
}

export function VoiceMicButton({
  isListening,
  onToggle,
  className = "",
  size = "default",
}: VoiceMicButtonProps) {
  const isLarge = size === "large";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isListening ? "Stop listening" : "Start voice assistant"}
      aria-pressed={isListening}
      className={`relative inline-flex items-center justify-center rounded-full transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer ${
        isListening
          ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/50"
          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-emerald-600/30"
      } ${isLarge ? "h-16 w-16 md:h-20 md:w-20" : "h-11 w-11"} ${className}`}
    >
      {isListening ? (
        <MicOff className={isLarge ? "h-8 w-8" : "h-5 w-5"} aria-hidden="true" />
      ) : (
        <Mic className={isLarge ? "h-8 w-8" : "h-5 w-5"} aria-hidden="true" />
      )}
      <ScreenReaderOnly>
        {isListening ? "Microphone active, listening. Click to stop." : "Microphone off. Click to speak."}
      </ScreenReaderOnly>
    </button>
  );
}

