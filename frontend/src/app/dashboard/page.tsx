"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { useA11y } from "@/core/a11y/a11y-context";
import { Play, Volume2, Bot, Briefcase, Award, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { speak } = useA11y();

  // Spoken welcome on initial page load (FR-2.2)
  useEffect(() => {
    speak(
      "Welcome to your Ableway dashboard. You have one active course: Fundamentals of Effective Communication, Week 10. Press Space to speak a voice command, or say 'How am I doing' to hear your progress."
    );
  }, [speak]);

  const speakProgress = () => {
    speak(
      "Progress summary: You have completed 9 out of 15 weeks in Fundamentals of Effective Communication. Your overall score is 60 percent. Next up is Week 10: Deliverables."
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <AppHeader />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome & Spoken Summary Banner */}
        <section aria-labelledby="welcome-heading" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
                Learner Dashboard
              </span>
              <h1 id="welcome-heading" className="text-2xl sm:text-3xl font-extrabold text-white">
                Welcome back, Björn
              </h1>
              <p className="text-slate-400 text-sm max-w-xl">
                WR 100: Fundamentals of Effective Communication (Cohort F26). Week 10 in progress.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={speakProgress}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl font-medium transition flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-400 cursor-pointer shadow-md"
                aria-label="Speak progress summary"
              >
                <Volume2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                <span>Hear Progress Summary</span>
              </button>
            </div>
          </div>
        </section>

        {/* Continue Learning Card */}
        <section aria-labelledby="continue-heading" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-mono bg-emerald-900/60 text-emerald-300 px-3 py-1 rounded-full border border-emerald-600/40">
                Continue Where You Left Off
              </span>
              <h2 id="continue-heading" className="text-xl sm:text-2xl font-bold text-white">
                Week 10: Deliverables &amp; Core Communication
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Mastering structured verbal articulation and professional audience interaction. Includes audio lesson and interactive spoken practice.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/learn/wr-100/lesson-10"
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg transition flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-300"
              >
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                <span>Resume Audio Lesson</span>
              </Link>

              <Link
                href="/learn/wr-100"
                className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <span>View All 15 Weeks</span>
              </Link>
            </div>
          </div>

          {/* Quick AI Tutor Help */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Bot className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-white">AI Spoken Tutor</h2>
              <p className="text-slate-400 text-sm">
                Have a question about this week's lesson? The AI tutor explains concepts at your pace.
              </p>
            </div>

            <Link
              href="/tutor"
              className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl shadow transition flex items-center justify-between focus:outline-none focus:ring-4 focus:ring-purple-300"
            >
              <span>Ask Tutor by Voice</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Quick Access Grid: Jobs, Skills, Accessible Reference */}
        <section aria-labelledby="shortcuts-heading" className="space-y-4">
          <h2 id="shortcuts-heading" className="text-xl font-bold text-white">
            Quick Actions &amp; Opportunities
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Jobs */}
            <Link
              href="/jobs"
              className="group bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <div className="space-y-2">
                <div className="h-9 w-9 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Briefcase className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-lg text-white group-hover:text-emerald-400 transition">
                  Accessible Job Portal
                </h3>
                <p className="text-slate-400 text-sm">
                  Search remote and accessible positions verified for screen-reader and voice tools.
                </p>
              </div>
              <span className="text-xs text-emerald-400 font-medium mt-4 flex items-center gap-1">
                Explore listings &rarr;
              </span>
            </Link>

            {/* Skills Profile */}
            <Link
              href="/profile"
              className="group bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <div className="space-y-2">
                <div className="h-9 w-9 rounded-lg bg-sky-950 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Award className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-lg text-white group-hover:text-sky-400 transition">
                  Verified Skills Profile
                </h3>
                <p className="text-slate-400 text-sm">
                  View earned skills, certifications, and configure granular employer sharing.
                </p>
              </div>
              <span className="text-xs text-sky-400 font-medium mt-4 flex items-center gap-1">
                View skills &rarr;
              </span>
            </Link>

            {/* Savanna Reference Pages */}
            <Link
              href="/savanna"
              className="group bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <div className="space-y-2">
                <div className="h-9 w-9 rounded-lg bg-amber-950 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Volume2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-lg text-white group-hover:text-amber-400 transition">
                  Savanna Static Pages
                </h3>
                <p className="text-slate-400 text-sm">
                  Direct access to the static learner dashboards (paced, self-paced, and concept).
                </p>
              </div>
              <span className="text-xs text-amber-400 font-medium mt-4 flex items-center gap-1">
                Open Savanna Hub &rarr;
              </span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

