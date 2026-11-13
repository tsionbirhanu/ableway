"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Briefcase, Bot, User, SunMoon, Home } from "lucide-react";
import { useA11y } from "@/lib/a11y/a11y-context";
import { VoiceMicButton } from "../voice/voice-mic-button";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { VoiceStatusBar } from "../voice/voice-status-bar";
import { SkipLink } from "./skip-link";

function HeaderContent() {
  const pathname = usePathname();
  const { preferences, setContrastTheme, setInteractionMode } = useA11y();
  const { isListening, toggleListening, transcript, error } = useVoiceAssistant();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/learn", label: "Learn", icon: BookOpen },
    { href: "/tutor", label: "AI Tutor", icon: Bot },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const cycleContrast = () => {
    const themes = ["default", "high-contrast", "dark-contrast", "yellow-black"] as const;
    const currentIndex = themes.indexOf(preferences.contrastTheme as (typeof themes)[number]);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setContrastTheme(nextTheme);
  };

  return (
    <>
      <SkipLink />
      <header className="bg-slate-950 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-lg font-bold tracking-tight text-white hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1"
            >
              Ableway <span className="text-emerald-400 font-normal">| Voice & Accessible</span>
            </Link>

            {/* Current Interaction Mode Pill */}
            <button
              onClick={() => {
                const nextMode =
                  preferences.interactionMode === "voice-first"
                    ? "screen-reader"
                    : preferences.interactionMode === "screen-reader"
                    ? "hybrid"
                    : "voice-first";
                setInteractionMode(nextMode);
              }}
              title="Click to switch interaction mode"
              className="hidden sm:inline-flex text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
            >
              Mode: {preferences.interactionMode}
            </button>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const isActive = pathname ? pathname.startsWith(item.href) : false;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: High Contrast + Voice Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cycleContrast}
              aria-label={`Toggle contrast theme (current: ${preferences.contrastTheme})`}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              title="Change Contrast Theme"
            >
              <SunMoon className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Prominent Voice Assistant Button */}
            <VoiceMicButton isListening={isListening} onToggle={toggleListening} />
          </div>
        </div>
      </header>

      {/* Floating status bar when voice is listening or active */}
      <VoiceStatusBar isListening={isListening} transcript={transcript} error={error} />
    </>
  );
}

export function AppHeader() {
  return (
    <React.Suspense fallback={<header className="bg-slate-950 border-b border-slate-800 h-16" />}>
      <HeaderContent />
    </React.Suspense>
  );
}
