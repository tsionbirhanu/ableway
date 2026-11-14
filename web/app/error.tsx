"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, PhoneCall, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error caught by boundary:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8" role="alert">
      {/* Header (Rule 2: Exactly one h1) */}
      <header className="space-y-3">
        <div className="w-16 h-16 rounded-full bg-red-950 border-2 border-red-500 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" aria-hidden="true" />
        </div>
        <span className="font-mono text-red-400 font-bold text-sm tracking-wider uppercase">
          Server Error (500)
        </span>
        <h1 id="error-h1" className="text-3xl sm:text-4xl font-extrabold text-white">
          Something went wrong on our end
        </h1>
        <p className="text-slate-200 text-base leading-relaxed max-w-lg mx-auto">
          An unexpected error occurred. You can try refreshing the page, go back to the home hub, or
          call a human helper for assistance.
        </p>
      </header>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <button
          type="button"
          onClick={() => reset()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl min-h-[48px] text-sm shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-300"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-6 rounded-2xl min-h-[48px] text-sm border border-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-400"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          <span>Back to Home</span>
        </Link>

        <Link
          href="/payment#human-help"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-6 rounded-2xl min-h-[48px] text-sm border border-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-400"
        >
          <PhoneCall className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>Call a Person</span>
        </Link>
      </div>
    </div>
  );
}
