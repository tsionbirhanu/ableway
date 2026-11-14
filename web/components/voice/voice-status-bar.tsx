"use client";

import React from "react";
import { Mic, Volume2 } from "lucide-react";

interface VoiceStatusBarProps {
  isListening: boolean;
  transcript: string;
  error?: string | null;
}

export function VoiceStatusBar({ isListening, transcript, error }: VoiceStatusBarProps) {
  if (!isListening && !transcript && !error) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-lg w-11/12 bg-slate-900/95 border border-slate-700 backdrop-blur-md rounded-xl p-3 shadow-2xl text-white flex items-center gap-3"
    >
      <div className="flex-none">
        {isListening ? (
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
        ) : (
          <Volume2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        )}
      </div>

      <div className="flex-1 text-sm truncate">
        {error ? (
          <span className="text-rose-400 font-medium">{error}</span>
        ) : isListening ? (
          transcript ? (
            <span className="text-emerald-300 font-medium">&ldquo;{transcript}&rdquo;</span>
          ) : (
            <span className="text-slate-300">
              Listening for commands... (e.g. &ldquo;Help&rdquo;, &ldquo;Home&rdquo;)
            </span>
          )
        ) : (
          <span className="text-slate-300">&ldquo;{transcript}&rdquo;</span>
        )}
      </div>

      <Mic
        className={`h-4 w-4 ${isListening ? "text-rose-400" : "text-slate-400"}`}
        aria-hidden="true"
      />
    </div>
  );
}
