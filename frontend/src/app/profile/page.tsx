"use client";

import React, { useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { useA11y } from "@/core/a11y/a11y-context";
import { ContrastTheme, InteractionMode, TextSize } from "@/types/a11y";
import { User, Volume2, Shield, Eye, Settings, Award } from "lucide-react";

export default function ProfilePage() {
  const {
    preferences,
    setInteractionMode,
    setContrastTheme,
    setTextSize,
    setSpeechRate,
    speak,
  } = useA11y();

  useEffect(() => {
    speak(
      "Profile and accessibility preferences. Configure speech rate, contrast theme, and interaction mode."
    );
  }, [speak]);

  const skills = [
    { name: "Verbal Articulation", level: "Advanced", verified: true },
    { name: "Active Listening", level: "Advanced", verified: true },
    { name: "Email Etiquette", level: "Intermediate", verified: true },
    { name: "Screen Reader Navigation", level: "Intermediate", verified: false },
    { name: "Calendar Management", level: "Beginner", verified: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <AppHeader />

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-1">
          <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            FR-7.1 &amp; FR-7.2 &bull; Settings
          </span>
          <h1 className="text-3xl font-extrabold text-white">Profile &amp; Accessibility Preferences</h1>
          <p className="text-slate-400 text-sm">
            Customize voice rates, contrast modes, and manage your verified skills credentials.
          </p>
        </div>

        {/* Profile Card */}
        <section aria-labelledby="profile-heading" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-none">
            <User className="h-8 w-8" aria-hidden="true" />
          </div>
          <div>
            <h2 id="profile-heading" className="text-xl font-bold text-white">
              Björn Sibanda
            </h2>
            <span className="text-sm text-slate-400">Learner &bull; bjorn.sibanda@example.com</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-600/30">
                Cohort F26-SEM-16W
              </span>
            </div>
          </div>
        </section>

        {/* Accessibility Configuration Grid */}
        <section aria-labelledby="a11y-heading" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Interaction Mode */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <h2 id="a11y-heading" className="text-lg font-bold text-white">
                Interaction Mode (FR-1.5)
              </h2>
            </div>
            <p className="text-slate-400 text-xs">
              Choose your primary method. Screen Reader mode automatically suppresses in-app speech to prevent dual voice conflicts.
            </p>

            <div className="space-y-2">
              {[
                { id: "voice-first", label: "Voice-First (Spoken Audio & Voice Input)" },
                { id: "screen-reader", label: "Screen Reader (NVDA/JAWS with ARIA Live)" },
                { id: "hybrid", label: "Hybrid (Voice Input + Screen Reader/Keyboard)" },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    preferences.interactionMode === m.id
                      ? "bg-emerald-950/60 border-emerald-500 text-white font-medium"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="interaction-mode"
                    checked={preferences.interactionMode === m.id}
                    onChange={() => setInteractionMode(m.id as InteractionMode)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Speech Rate Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <h2 className="text-lg font-bold text-white">Speech Synthesis Speed (FR-2.8)</h2>
            </div>
            <p className="text-slate-400 text-xs">
              Adjust how fast the platform voice speaks. Currently:{" "}
              <strong className="text-white">{preferences.speechRate}x</strong>
            </p>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={preferences.speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                aria-label="Speech speed rate slider"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>0.5x (Slow)</span>
              <span>1.0x (Normal)</span>
              <span>2.0x (Fast)</span>
            </div>

            <button
              type="button"
              onClick={() => speak("This is a test of your configured voice speed setting.")}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Test Voice Rate
            </button>
          </div>

          {/* Visual Contrast Theme */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <h2 className="text-lg font-bold text-white">Contrast Theme (IR-1.5)</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "default", label: "Default Dark" },
                { id: "high-contrast", label: "High Contrast" },
                { id: "dark-contrast", label: "Pure Black" },
                { id: "yellow-black", label: "Yellow on Black" },
              ].map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setContrastTheme(theme.id as ContrastTheme)}
                  className={`p-3 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                    preferences.contrastTheme === theme.id
                      ? "bg-emerald-600 text-white border-emerald-400 font-semibold"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Size (IR-1.5) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <h2 className="text-lg font-bold text-white">Text Size Scaling (IR-1.5)</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "normal", label: "Default 100%" },
                { id: "large", label: "Large 125%" },
                { id: "x-large", label: "X-Large 150%" },
                { id: "xx-large", label: "Maximum 200%" },
              ].map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setTextSize(size.id as TextSize)}
                  className={`p-3 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                    preferences.textSize === size.id
                      ? "bg-emerald-600 text-white border-emerald-400 font-semibold"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Verified Skills & Employer Sharing (FR-5.1 & FR-5.5) */}
        <section aria-labelledby="skills-heading" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <h2 id="skills-heading" className="text-lg font-bold text-white">
                Verified Skills Profile (FR-5.1)
              </h2>
            </div>
            <span className="text-xs text-emerald-400 font-medium">Granular Employer Sharing Active</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skills.map((s) => (
              <div
                key={s.name}
                className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-sm text-white">{s.name}</h3>
                  <span className="text-xs text-slate-400">{s.level}</span>
                </div>
                {s.verified ? (
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-mono">
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    In Progress
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

