"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useA11y } from "@/core/a11y/a11y-context";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { VoiceMicButton } from "@/components/voice/voice-mic-button";
import { InteractionMode } from "@/types/a11y";
import { Volume2, Keyboard, Sparkles, ArrowRight, Check } from "lucide-react";

export default function OnboardingPage() {
  const { preferences, setInteractionMode, speak } = useA11y();
  const { isListening, toggleListening } = useVoiceAssistant();

  const [step, setStep] = useState<"mode" | "tutorial" | "done">("mode");

  useEffect(() => {
    speak(
      "Welcome to Ableway! Let us get you set up. First, please select how you prefer to interact: Voice-first, Screen reader with keyboard, or Hybrid."
    );
  }, [speak]);

  const selectMode = (mode: InteractionMode) => {
    setInteractionMode(mode);
    setStep("tutorial");
    speak(
      `You selected ${mode} mode. Here is a quick tutorial: At any time, you can press the Space bar or tap the microphone to speak a command like 'Home', 'Next Lesson', or 'Help'.`
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 text-slate-100 p-4 sm:p-6">
      <main id="main-content" className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            FR-1.5 &amp; FR-1.6 &bull; Guided Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome to Ableway</h1>
          <p className="text-slate-400 text-sm">
            Designed for blind and visually impaired learners to acquire digital skills independently.
          </p>
        </div>

        {step === "mode" && (
          <section aria-labelledby="mode-selection" className="space-y-4">
            <h2 id="mode-selection" className="text-lg font-bold text-white text-center">
              How would you like to interact?
            </h2>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => selectMode("voice-first")}
                className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 transition text-left flex items-start gap-4 cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-400"
              >
                <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex-none">
                  <Volume2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Voice-First Mode</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Recommended for users who do not use a screen reader. Spoken instructions and voice commands guide you through every page.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectMode("screen-reader")}
                className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500 transition text-left flex items-start gap-4 cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-400"
              >
                <div className="p-2.5 rounded-xl bg-sky-950 border border-sky-500/30 text-sky-400 flex-none">
                  <Keyboard className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Screen Reader &amp; Keyboard Mode</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    For NVDA, JAWS, VoiceOver, or TalkBack users. In-app speech is suppressed to avoid clashing voices; full ARIA semantics are enabled.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectMode("hybrid")}
                className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500 transition text-left flex items-start gap-4 cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-400"
              >
                <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-500/30 text-purple-400 flex-none">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Hybrid Mode</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Combine spoken voice input with fast keyboard shortcuts and screen reader announcements.
                  </p>
                </div>
              </button>
            </div>
          </section>
        )}

        {step === "tutorial" && (
          <section aria-labelledby="tutorial-heading" className="space-y-6">
            <h2 id="tutorial-heading" className="text-xl font-bold text-white text-center">
              Quick Voice Navigation Tutorial
            </h2>

            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 text-sm text-slate-300">
              <p>
                Try pressing the microphone button below or press <strong>Space</strong>, then speak:
              </p>
              <ul className="list-disc list-inside space-y-1 font-mono text-emerald-300 text-xs">
                <li>"Where am I"</li>
                <li>"Help"</li>
                <li>"Next lesson"</li>
              </ul>
            </div>

            <div className="flex justify-center py-2">
              <VoiceMicButton isListening={isListening} onToggle={toggleListening} size="large" />
            </div>

            <button
              type="button"
              onClick={() => {
                setStep("done");
                speak("Setup complete! Entering your dashboard now.");
              }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-300 cursor-pointer shadow-lg"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>
        )}

        {step === "done" && (
          <section aria-labelledby="done-heading" className="space-y-6 text-center">
            <div className="h-16 w-16 bg-emerald-950 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 id="done-heading" className="text-2xl font-bold text-white">
              You are all set!
            </h2>
            <p className="text-slate-300 text-sm">
              Your preferences have been saved as <strong>{preferences.interactionMode}</strong>.
            </p>

            <Link
              href="/dashboard"
              className="inline-flex w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-lg"
            >
              <span>Enter Ableway</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

