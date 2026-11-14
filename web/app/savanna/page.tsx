"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Layers, ArrowLeft } from "lucide-react";

function SavannaContent() {
  const searchParams = useSearchParams();
  const initialPage = searchParams.get("page") || "homepage-v1-paced.html";
  const [currentPage, setCurrentPage] = useState(initialPage);

  const pages = [
    { name: "1. Paced Track", file: "homepage-v1-paced.html" },
    { name: "2. Self-Paced Track", file: "homepage-v1-self-paced.html" },
    { name: "3. Concept Navigation", file: "concept-with-navigation.html" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950">
      {/* Savanna Switcher Toolbar (Rule 12: min 44px) */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-200 hover:text-white font-bold min-h-[44px] px-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Hub</span>
          </Link>
          <span className="text-slate-600" aria-hidden="true">
            |
          </span>
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Layers className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <h1 className="text-sm font-bold m-0 p-0 text-white">ALX Savanna Learning Portal</h1>
          </div>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-2">
          {pages.map((p) => (
            <button
              key={p.file}
              type="button"
              onClick={() => setCurrentPage(p.file)}
              className={`px-3 py-2 rounded-lg font-bold min-h-[44px] transition-colors border ${
                currentPage === p.file
                  ? "bg-emerald-600 border-emerald-400 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              }`}
              aria-pressed={currentPage === p.file}
            >
              {p.name}
            </button>
          ))}
          <a
            href={`/pages/${currentPage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-200 hover:text-emerald-400 flex items-center gap-1 px-3 py-2 min-h-[44px] border border-slate-700 rounded-lg bg-slate-800 font-bold"
            title="Open in Standalone Browser Tab"
          >
            <span>Standalone</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Embedded Savanna Canvas */}
      <div className="flex-1 w-full bg-white">
        <iframe
          src={`/pages/${currentPage}`}
          title={`ALX Savanna Curriculum: ${currentPage}`}
          className="w-full h-full border-none"
        />
      </div>
    </div>
  );
}

export default function SavannaPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-200">Loading Savanna Portal...</div>}
    >
      <SavannaContent />
    </Suspense>
  );
}
