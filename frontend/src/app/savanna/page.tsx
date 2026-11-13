'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Layers, ArrowLeft } from 'lucide-react';

function SavannaContent() {
  const searchParams = useSearchParams();
  const initialPage = searchParams.get('page') || 'homepage-v1-paced.html';
  const [currentPage, setCurrentPage] = useState(initialPage);

  const pages = [
    { name: 'Paced Track', file: 'homepage-v1-paced.html' },
    { name: 'Self-Paced Track', file: 'homepage-v1-self-paced.html' },
    { name: 'Concept Navigation', file: 'concept-with-navigation.html' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950">
      {/* Savanna Switcher Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1 text-slate-300 hover:text-white font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Hub</span>
          </a>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>ALX Savanna Portal</span>
          </div>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-1.5">
          {pages.map((p) => (
            <button
              key={p.file}
              onClick={() => setCurrentPage(p.file)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                currentPage === p.file
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p.name}
            </button>
          ))}
          <a
            href={`/pages/${currentPage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-slate-400 hover:text-emerald-400 flex items-center gap-1"
            title="Open in Standalone Browser Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Embedded Savanna Canvas */}
      <div className="flex-1 w-full bg-white">
        <iframe
          src={`/pages/${currentPage}`}
          title={`ALX Savanna: ${currentPage}`}
          className="w-full h-full border-none"
        />
      </div>
    </div>
  );
}

export default function SavannaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Savanna Portal...</div>}>
      <SavannaContent />
    </Suspense>
  );
}
