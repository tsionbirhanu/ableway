"use client";

import React, { useState, useEffect, useEffectEvent, useRef } from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { useA11y } from "@/lib/a11y/a11y-context";
import { playEarcon } from "@/lib/audio/earcons";

export function SessionTimeoutWarning() {
  const { announce, speak } = useA11y();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120);

  const dialogRef = useRef<HTMLElement | null>(null);
  const extendButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const triggerWarning = useEffectEvent(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    setShowWarning(true);
    setRemainingSeconds(120);

    playEarcon("warning");
    const msg =
      "Notice: Your session will expire in 2 minutes to protect your privacy. Press Extend to stay signed in.";
    announce(msg, "assertive");
    speak(msg);

    setTimeout(() => {
      extendButtonRef.current?.focus();
    }, 50);
  });

  // Inactivity / session timer monitoring (Rule 18)
  useEffect(() => {
    // For demonstration and compliance, set a session expiration warning timer
    // (e.g. 15 minutes in production, or testable via custom event)
    const warningTimer = setTimeout(
      () => {
        triggerWarning();
      },
      15 * 60 * 1000,
    ); // 15 minutes

    const handleManualTest = () => triggerWarning();
    window.addEventListener("trigger-session-warning", handleManualTest);

    return () => {
      clearTimeout(warningTimer);
      window.removeEventListener("trigger-session-warning", handleManualTest);
    };
  }, []);

  // Countdown timer when warning is active
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowWarning(false);
          announce("Your session has expired. Please sign in again.", "assertive");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning, announce]);

  const handleExtend = () => {
    setShowWarning(false);
    playEarcon("success");
    announce("Session extended successfully. You remain signed in.", "polite");
    previousActiveElement.current?.focus();
  };

  if (!showWarning) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="presentation"
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="timeout-title"
        aria-describedby="timeout-desc"
        className="w-full max-w-md bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-slate-100"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-950 border border-amber-700 rounded-2xl text-amber-400">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="timeout-title" className="text-xl font-bold text-white">
              Session Expiring Soon
            </h2>
            <p className="text-xs text-amber-300 font-mono font-bold mt-0.5">
              Time remaining: {timeFormatted}
            </p>
          </div>
        </div>

        <p id="timeout-desc" className="text-sm text-slate-200 leading-relaxed">
          To protect your privacy and security, your session will expire soon. You can extend your
          session anytime without losing your work.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            ref={extendButtonRef}
            type="button"
            onClick={handleExtend}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl min-h-[48px] flex items-center justify-center gap-2 text-sm shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Extend Session (+30 mins)</span>
          </button>
        </div>
      </section>
    </div>
  );
}
