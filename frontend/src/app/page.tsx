"use client";

import { useState } from "react";
import Link from "next/link";

interface SavannaPage {
  id: string;
  name: string;
  badge: string;
  description: string;
  path: string;
}

const SAVANNA_PAGES: SavannaPage[] = [
  {
    id: "paced",
    name: "Learner Homepage (Paced)",
    badge: "WR 100",
    description: "Björn Sibanda — Week 10 of Fundamentals of Effective Communication",
    path: "/pages/homepage-v1-paced.html",
  },
  {
    id: "self-paced",
    name: "Learner Homepage (Self-Paced)",
    badge: "VA-1",
    description: "Amara Nwosu — Module 1 of 3 complete on VA Foundations",
    path: "/pages/homepage-v1-self-paced.html",
  },
  {
    id: "concept",
    name: "Concept with Navigation",
    badge: "Module 2",
    description: "The Future of the VA Industry — Concept page with side navigation",
    path: "/pages/concept-with-navigation.html",
  },
  {
    id: "hub",
    name: "Savanna Hub / Index",
    badge: "Overview",
    description: "Landing portal linking all captured static pages and resources",
    path: "/savanna/index.html",
  },
];

export default function Home() {
  const [activePageId, setActivePageId] = useState<string>("paced");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const activePage = SAVANNA_PAGES.find((p) => p.id === activePageId) || SAVANNA_PAGES[0];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      {!isFullscreen && (
        <header className="flex-none bg-slate-950 border-b border-slate-800 px-4 py-2.5 z-20 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Project / Brand Identity */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold tracking-tight text-white text-base">
                  Ableway <span className="text-emerald-400 font-normal">| Savanna</span>
                </span>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                Frontend Integrated
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {SAVANNA_PAGES.map((page) => {
                const isActive = page.id === activePageId;
                return (
                  <button
                    key={page.id}
                    onClick={() => setActivePageId(page.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <span>{page.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isActive ? "bg-emerald-800 text-emerald-100" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {page.badge}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <a
                href={activePage.path}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
                title="Open page in a new standalone tab"
              >
                <span>Standalone Tab</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>

              <button
                onClick={() => setIsFullscreen(true)}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Hide top bar for immersion"
              >
                <span>Full Screen</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Floating Exit Fullscreen Button */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-3 right-3 z-50 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full border border-slate-700 shadow-lg hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-sm"
        >
          <span>Exit Full Screen</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Main Content Area Displaying the Savanna Page */}
      <main className="flex-1 w-full h-full relative bg-white">
        <iframe
          key={activePage.path}
          src={activePage.path}
          title={activePage.name}
          className="w-full h-full border-0 absolute inset-0"
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </main>
    </div>
  );
}
