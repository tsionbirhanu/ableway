"use client";

import React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { ArrowLeft, Play, CheckCircle } from "lucide-react";

export default function CourseDetailPage() {
  const weeks = Array.from({ length: 15 }, (_, i) => ({
    week: i + 1,
    title: `Week ${i + 1}: ${
      i === 9
        ? "Deliverables & Core Verbal Delivery"
        : i < 9
          ? "Foundational Communication Concepts"
          : "Advanced Workplace Application"
    }`,
    completed: i < 9,
    current: i === 9,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <AppHeader />

      <main
        id="main-content"
        className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8"
      >
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Courses</span>
        </Link>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            WR 100 &bull; Cohort F26
          </span>
          <h1 className="text-3xl font-extrabold text-white">
            Fundamentals of Effective Communication
          </h1>
          <p className="text-slate-400 text-sm">
            15 weeks curriculum. Pre-rendered and accessible via voice or keyboard navigation.
          </p>
        </div>

        <div className="space-y-3">
          {weeks.map((w) => (
            <div
              key={w.week}
              className={`p-5 rounded-2xl border flex items-center justify-between transition ${
                w.current
                  ? "bg-emerald-950/40 border-emerald-500 shadow-lg ring-1 ring-emerald-500"
                  : w.completed
                    ? "bg-slate-900 border-slate-800 text-slate-300"
                    : "bg-slate-900/60 border-slate-800 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-3">
                {w.completed ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-none" aria-hidden="true" />
                ) : (
                  <span className="h-5 w-5 rounded-full border border-slate-700 flex-none" />
                )}
                <div>
                  <h2 className="font-semibold text-base text-white">{w.title}</h2>
                  <span className="text-xs text-slate-400">
                    {w.completed ? "Completed" : w.current ? "Current lesson" : "Upcoming"}
                  </span>
                </div>
              </div>

              <Link
                href={`/learn/wr-100/lesson-${w.week}`}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                  w.current
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                }`}
              >
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>{w.completed ? "Review" : "Start"}</span>
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
