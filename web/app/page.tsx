"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Volume2,
  Headphones,
  CheckCircle2,
  ShieldCheck,
  PhoneCall,
  Clock,
} from "lucide-react";
import { useA11y } from "@/lib/a11y/a11y-context";
import { getTranslation } from "@/lib/i18n/translations";

export default function HomePage() {
  const { language } = useA11y();
  const [selectedTrack, setSelectedTrack] = useState<"all" | "data" | "communication" | "va">(
    "all",
  );
  const t = getTranslation(language);
  const isAmharic = language === "am-ET" || language === "am";

  const courses = [
    {
      id: "data-analytics",
      title: "Data Analytics",
      track: "data",
      duration: "14 Weeks",
      badge: t.home.badgeMostPopular || "Most Popular",
      description:
        "Companies across every industry are hiring people who can turn data into decisions that drive real results. Learn Python, SQL, Tableau, and data modeling with audio lessons and screen reader friendly exercises.",
      skills: ["Python", "SQL", "Tableau", "Statistical Thinking"],
      accessibleBadge: "Audio Lessons & Voice Assisted",
      link: "/courses",
    },
    {
      id: "wr-100",
      title: "WR 100: Fundamentals of Effective Communication",
      track: "communication",
      duration: "10 Weeks",
      badge: t.home.badgeSavanna || "Savanna Curriculum",
      description:
        "Master high-impact professional communication: written correspondence, active listening, executive presentation, and verbal persuasion designed specifically for inclusive workplace environments.",
      skills: ["Business Writing", "Verbal Pitching", "Active Listening", "Conflict Resolution"],
      accessibleBadge: "Full Spoken Audio & Quizzes",
      link: "/courses",
    },
    {
      id: "va-1",
      title: "VA-1: Virtual Assistant Foundations",
      track: "va",
      duration: "8 Weeks",
      badge: t.home.badgeFastTrack || "Fast-Track",
      description:
        "Learn remote executive operations, calendar and email triage, meeting facilitation, and document preparation using accessible cloud tools and collaborative AI workflows.",
      skills: ["Calendar Management", "Email Triage", "Google Docs", "Customer Relations"],
      accessibleBadge: "Keyboard-Only Verified",
      link: "/courses",
    },
  ];

  const filteredCourses =
    selectedTrack === "all" ? courses : courses.filter((c) => c.track === selectedTrack);

  const savannaPages = [
    {
      name: "Homepage V1 - Paced",
      description:
        "Full ALX Savanna curriculum with weekly tracker and embedded voice-accessibility toolbar.",
      path: "/savanna?page=homepage-v1-paced.html",
    },
    {
      name: "Homepage V1 - Self Paced",
      description: "Self-paced track with modular progress milestones and voice navigation.",
      path: "/savanna?page=homepage-v1-self-paced.html",
    },
    {
      name: "Concept with Navigation",
      description: "Interactive concept lesson view with accessible focus states.",
      path: "/savanna?page=concept-with-navigation.html",
    },
  ];

  return (
    <div className="bg-white text-slate-900 font-sans flex flex-col w-full">
      {/* 1. Announcement Banner Matching ALX Savanna Design */}
      <aside
        aria-label="Important Announcement"
        className="bg-[#FFF8E6] border-b border-[#FEE7A6] py-2.5 px-4 text-center text-xs sm:text-sm text-slate-800"
      >
        <p>
          {t.home.announcementText}{" "}
          <Link
            href="/register"
            className="underline font-bold text-slate-900 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-0.5"
          >
            {t.home.announcementLink}
          </Link>
        </p>
      </aside>

      {/* 2. HERO SECTION (Cosmic Dark Swirl Background) */}
      <section
        aria-labelledby="hero-heading"
        className="relative bg-[#050B17] text-white py-16 sm:py-24 px-4 sm:px-8 overflow-hidden min-h-[520px] flex items-center"
        style={{
          backgroundImage:
            "radial-gradient(circle at 75% 45%, rgba(147, 51, 234, 0.35) 0%, rgba(37, 99, 235, 0.25) 30%, rgba(5, 11, 23, 0.95) 70%)",
        }}
      >
        <div
          className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 opacity-30 pointer-events-none bg-no-repeat bg-right bg-contain"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(59, 130, 246, 0.2) 40%, transparent 70%)",
          }}
        />

        <div className="max-w-7xl mx-auto w-full relative z-10 space-y-6">
          {/* Breadcrumb matching screenshot */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300"
          >
            <Link
              href="/courses"
              className="hover:text-white underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded"
            >
              {isAmharic ? "AI እና ዳታ" : "AI & Data"}
            </Link>
            <span className="text-slate-500" aria-hidden="true">
              &gt;
            </span>
            <span className="text-white">{t.home.heroTitle}</span>
          </nav>

          {/* Main Headline (F0 Rule 2: Single h1 per page) */}
          <h1
            id="hero-heading"
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-3xl"
          >
            {t.home.heroTitle}
          </h1>

          {/* Description */}
          <p className="text-base sm:text-xl text-slate-200 max-w-2xl leading-relaxed">
            {t.home.heroDescription}
          </p>

          {/* Clean CTA Buttons: No harsh strokes, polished surfaces */}
          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-xl">
            <Link
              href="/register"
              id="hero-register-btn"
              className="min-h-[48px] px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-base flex items-center justify-center shadow-lg hover:shadow-orange-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 cursor-pointer"
            >
              <span>
                {isAmharic ? "አካውንት ይፍጠሩ (የድምጽ ረዳት)" : "Create Account (Voice Assistant)"}
              </span>
            </Link>

            <Link
              href="/login"
              id="hero-login-btn"
              className="min-h-[48px] px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base flex items-center justify-center backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            >
              <span>{isAmharic ? "ወደ መለያዎ ይግቡ" : "Sign In to Account"}</span>
            </Link>
          </div>

          {/* Accessibility badges */}
          <div className="pt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
              <Volume2 className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
              Hands-Free Spoken Assistant
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
              <Headphones className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
              Audio-First Lessons
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              Zero CAPTCHA &amp; WCAG 2.2 AA
            </span>
          </div>
        </div>
      </section>

      {/* 3. FEATURED PROGRAMMES SECTION (Interactive & Usable) */}
      <section
        aria-labelledby="programmes-heading"
        className="py-16 px-4 sm:px-8 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h2
                id="programmes-heading"
                className="text-3xl sm:text-4xl font-extrabold text-slate-900"
              >
                {t.home.curriculumTitle || "Featured Programmes"}
              </h2>
              <p className="text-base text-slate-600 max-w-2xl">
                {t.home.curriculumSubtitle ||
                  "Every programme includes complete audio narration, screen-reader optimized exercises, keyboard-first navigation, and accessible live quizzes."}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Course tracks filter">
              <button
                type="button"
                onClick={() => setSelectedTrack("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                  selectedTrack === "all"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.home.filterAll || "All Programmes"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrack("data")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                  selectedTrack === "data"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.home.filterData || "Data & AI"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrack("communication")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                  selectedTrack === "communication"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.home.filterComm || "Communication (WR 100)"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrack("va")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                  selectedTrack === "va"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.home.filterVA || "Virtual Assistant (VA-1)"}
              </button>
            </div>
          </div>

          {/* Course Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {filteredCourses.map((c) => (
              <article
                key={c.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full">
                      {c.badge}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {c.duration}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 leading-snug">{c.title}</h3>

                  <p className="text-sm text-slate-600 leading-relaxed">{c.description}</p>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-semibold text-slate-700 block">
                      Skills gained:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {c.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{c.accessibleBadge}</span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={c.link}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B132B] hover:bg-[#152248] text-white font-bold text-xs text-center shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      {t.home.startCourseBtn || "Explore Curriculum"}
                    </Link>
                    <Link
                      href="/register"
                      className="py-2.5 px-4 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
                      title="Enroll via Accessible Registration"
                    >
                      Enroll Now
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ABOUT ABLEWAY ACCESSIBILITY SECTION (`#about`) */}
      <section
        id="about"
        aria-labelledby="about-heading"
        className="py-16 px-4 sm:px-8 bg-slate-50 border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-widest bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
              Inclusive Tech Education
            </span>
            <h2 id="about-heading" className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              {t.home.a11yTitle || "Built for Blind and Visually Impaired Learners"}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              {t.home.a11ySubtitle ||
                "Ableway bridges the gap between digital curricula and assistive technologies, delivering full autonomy through voice, keyboard, and human support."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-orange-400 flex items-center justify-center border border-orange-500/50">
                <Volume2 className="w-5 h-5 text-orange-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Hands-Free Assistant</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Start once and speak naturally. The assistant speaks slowly, confirms inputs,
                supports letter-by-letter spelling, and auto-listens without clicking.
              </p>
            </div>

            <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-orange-400 flex items-center justify-center border border-orange-500/50">
                <Headphones className="w-5 h-5 text-orange-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Audio-First Lessons</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Structured audio narration, plain-language summaries, KaTeX math pronunciation, and
                earcon sound cues provide rich, non-visual context.
              </p>
            </div>

            <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-orange-400 flex items-center justify-center border border-orange-500/50">
                <PhoneCall className="w-5 h-5 text-orange-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Human Helper Queue</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Stuck on a tricky concept or payment? Request staff assistance with 1-click or voice
                command for immediate human voice assistance.
              </p>
            </div>

            <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-orange-400 flex items-center justify-center border border-orange-500/50">
                <ShieldCheck className="w-5 h-5 text-orange-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zero Barrier Auth</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                No visual CAPTCHAs, no confusing puzzles. One-time codes sent to email or phone
                accept simple paste and screen reader autofill.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ACCESSIBILITY STANDARDS & STATISTICS */}
      <section
        aria-label="Accessibility Metrics"
        className="py-12 px-4 sm:px-8 bg-slate-900 text-white border-b border-slate-800"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-black text-orange-400">
              {t.home.stat1 || "100%"}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {t.home.stat1Label || "Keyboard Navigable with Zero Traps"}
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-black text-orange-400">
              {t.home.stat2 || "0.80x"}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {t.home.stat2Label || "Calm, Clear Audio Assistant Cadence"}
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-4xl sm:text-5xl font-black text-emerald-400">
              {t.home.stat3 || "WCAG AAA"}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {t.home.stat3Label || "High-Contrast Text & Visible Focus Rings"}
            </p>
          </div>
        </div>
      </section>

      {/* 6. SAVANNA CURRICULUM PORTAL TRACKS */}
      <section
        aria-labelledby="savanna-heading"
        className="py-12 px-4 sm:px-8 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-orange-800 uppercase tracking-widest bg-orange-100 px-3 py-0.5 rounded-full border border-orange-200">
                ALX Savanna Curriculum
              </span>
              <h2
                id="savanna-heading"
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2"
              >
                Paced &amp; Self-Paced Learning Portal
              </h2>
            </div>
            <Link
              href="/savanna"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-orange-700 hover:text-orange-900 underline focus:outline-none focus:ring-2 focus:ring-orange-400 rounded"
            >
              <span>Explore All Savanna Views</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {savannaPages.map((page) => (
              <Link
                key={page.path}
                href={page.path}
                className="p-5 rounded-xl border border-slate-300 hover:border-orange-500 bg-slate-50 hover:bg-white transition-all shadow-sm group focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 group-hover:text-orange-700 text-sm">
                    {page.name}
                  </h3>
                  <ArrowRight
                    className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{page.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CALL TO ACTION SECTION */}
      <section aria-labelledby="cta-heading" className="py-16 px-4 sm:px-8 bg-[#0B132B] text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2
            id="cta-heading"
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight"
          >
            Ready to begin your accessible learning journey?
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Create your account in minutes using our spoken assistant or keyboard navigation. Join
            hundreds of learners preparing for remote tech careers.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-base shadow-lg hover:shadow-orange-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 flex items-center justify-center cursor-pointer"
            >
              <span>Create Your Account</span>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-white flex items-center justify-center cursor-pointer"
            >
              <span>Sign In with Existing Account</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
