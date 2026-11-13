'use client';

import React from 'react';
import { HelpCircle, PhoneCall, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8">
      {/* Page Header (Rule 2: Exactly one h1) */}
      <header className="space-y-3">
        <span className="font-mono text-emerald-400 font-bold text-sm tracking-wider uppercase">
          404 Page Not Found
        </span>
        <h1 id="not-found-h1" className="text-3xl sm:text-4xl font-extrabold text-white">
          We could not find that page
        </h1>
        <p className="text-slate-200 text-base leading-relaxed max-w-lg mx-auto">
          The link you followed may be broken, or the page may have been moved. You can return to the home page or speak directly with a human helper.
        </p>
      </header>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <a
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl min-h-[48px] text-sm shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-300"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          <span>Back to Home</span>
        </a>

        <a
          href="/payment#human-help"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-6 rounded-2xl min-h-[48px] text-sm border border-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-400"
        >
          <PhoneCall className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>Call a Person (Human Helper)</span>
        </a>
      </div>
    </div>
  );
}
