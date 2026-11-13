'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Sparkles,
  ArrowRight,
  BookOpen,
  Volume2,
  Headphones,
  CheckCircle2,
  ShieldCheck,
  PhoneCall,
  Clock,
  Award,
  Layers,
  HelpCircle,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';
import { getTranslation } from '@/core/i18n/translations';

export default function HomePage() {
  const { language, toggleLanguage } = useA11y();
  const [selectedTrack, setSelectedTrack] = useState<'all' | 'data' | 'communication' | 'va'>('all');
  const t = getTranslation(language);
  const isAmharic = language === 'am-ET';

  const courses = [
    {
      id: 'data-analytics',
      title: 'Data Analytics',
      track: 'data',
      duration: '14 Weeks',
      badge: 'Most Popular',
      description:
        'Companies across every industry are hiring people who can turn data into decisions that drive real results. Learn Python, SQL, Tableau, and data modeling with audio lessons and screen reader friendly exercises.',
      skills: ['Python', 'SQL', 'Tableau', 'Statistical Thinking'],
      accessibleBadge: 'Audio Lessons & Voice Assisted',
      link: '/courses',
    },
    {
      id: 'wr-100',
      title: 'WR 100: Fundamentals of Effective Communication',
      track: 'communication',
      duration: '10 Weeks',
      badge: 'Savanna Curriculum',
      description:
        'Master high-impact professional communication: written correspondence, active listening, executive presentation, and verbal persuasion designed specifically for inclusive workplace environments.',
      skills: ['Business Writing', 'Verbal Pitching', 'Active Listening', 'Conflict Resolution'],
      accessibleBadge: 'Full Spoken Audio & Quizzes',
      link: '/courses',
    },
    {
      id: 'va-1',
      title: 'VA-1: Virtual Assistant Foundations',
      track: 'va',
      duration: '8 Weeks',
      badge: 'Fast-Track',
      description:
        'Learn remote executive operations, calendar and email triage, meeting facilitation, and document preparation using accessible cloud tools and collaborative AI workflows.',
      skills: ['Calendar Management', 'Email Triage', 'Google Docs', 'Customer Relations'],
      accessibleBadge: 'Keyboard-Only Verified',
      link: '/courses',
    },
  ];

  const filteredCourses =
    selectedTrack === 'all' ? courses : courses.filter((c) => c.track === selectedTrack);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      {/* 1. SIMPLE, CLEAN ACCESSIBLE HEADER (Single Header with Only Necessary Links) */}
      <header className="sticky top-0 z-40 bg-[#0B132B] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand: alx | Ableway */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1"
            >
              <span className="text-2xl font-black tracking-tight text-white font-sans">
                al<span className="text-orange-400">x</span>
              </span>
              <span className="text-slate-400 font-light text-base">|</span>
              <span className="font-bold text-white tracking-tight text-base">Ableway</span>
            </Link>
            <span className="hidden sm:inline-block text-[11px] bg-slate-800 text-orange-300 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
              {t.nav.accessibleLearning}
            </span>
          </div>

          {/* Necessary Nav Links */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-6 text-sm font-semibold">
            <Link href="/" className="text-orange-400 hover:text-orange-300 transition-colors">
              {t.nav.home}
            </Link>
            <Link href="/courses" className="text-slate-200 hover:text-white transition-colors">
              {t.nav.courses}
            </Link>
            <a href="#about" className="text-slate-200 hover:text-white transition-colors">
              {t.nav.about}
            </a>
            <Link
              href="/payment#human-help"
              className="text-slate-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>{t.nav.support}</span>
            </Link>
          </nav>

          {/* Clean Action Buttons: Language Switch + Navy Blue with Orange Text */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Language Switch Button */}
            <button
              type="button"
              onClick={toggleLanguage}
              id="top-nav-lang-toggle"
              aria-label={`${t.nav.langCurrentLabel}: Switch language / ቋንቋ ቀይር`}
              title={isAmharic ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs border border-orange-500/80 bg-slate-900 hover:bg-slate-800 text-orange-400 hover:text-orange-300 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
              <span>{t.nav.langCurrentLabel}</span>
            </button>

            <Link
              href="/login"
              id="top-nav-login"
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-orange-400 hover:text-orange-300 font-bold text-xs sm:text-sm border border-orange-500/70 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
              <span>{t.nav.login}</span>
            </Link>
            <Link
              href="/register"
              id="top-nav-register"
              className="px-4 py-2 rounded-lg bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold text-xs sm:text-sm border-2 border-orange-500 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
              <span>{t.nav.register}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Announcement Banner Matching Screenshot */}
      <aside
        aria-label="Important Announcement"
        className="bg-[#FFF8E6] border-b border-[#FEE7A6] py-2.5 px-4 text-center text-xs sm:text-sm text-slate-800"
      >
        <p>
          {t.home.announcementText}{' '}
          <Link
            href="/register"
            className="underline font-bold text-slate-900 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-0.5"
          >
            {t.home.announcementLink}
          </Link>
        </p>
      </aside>

      <main className="flex-1">
        {/* 3. HERO SECTION Matching Screenshot (Cosmic Dark Swirl Background) */}
        <section
          aria-labelledby="hero-heading"
          className="relative bg-[#050B17] text-white py-16 sm:py-24 px-4 sm:px-8 overflow-hidden min-h-[520px] flex items-center"
          style={{
            backgroundImage:
              'radial-gradient(circle at 75% 45%, rgba(147, 51, 234, 0.35) 0%, rgba(37, 99, 235, 0.25) 30%, rgba(5, 11, 23, 0.95) 70%)',
          }}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 opacity-30 pointer-events-none bg-no-repeat bg-right bg-contain"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(59, 130, 246, 0.2) 40%, transparent 70%)',
            }}
          />

          <div className="max-w-7xl mx-auto w-full relative z-10 space-y-6">
            {/* Breadcrumb matching screenshot */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300">
              <Link href="/courses" className="hover:text-white underline underline-offset-4">
                {isAmharic ? 'AI እና ዳታ' : 'AI & Data'}
              </Link>
              <span className="text-slate-500">&gt;</span>
              <span className="text-white">{t.home.heroTitle}</span>
            </nav>

            {/* Main Headline */}
            <h1
              id="hero-heading"
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-3xl"
            >
              {t.home.heroTitle}
            </h1>

            {/* Description matching screenshot */}
            <p className="text-base sm:text-xl text-slate-200 max-w-2xl leading-relaxed">
              {t.home.heroDescription}
            </p>

            {/* Clean CTA Buttons: Navy Blue Background with Bold Orange Text */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-xl">
              <Link
                href="/register"
                id="hero-register-btn"
                className="min-h-[48px] px-6 py-3.5 rounded-lg bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold text-base flex items-center justify-center gap-2 border-2 border-orange-500 shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-orange-400"
              >
                <Sparkles className="w-5 h-5 text-orange-400" aria-hidden="true" />
                <span>{isAmharic ? 'አካውንት ይፍጠሩ (የድምጽ ረዳት)' : 'Create Account (Voice Assistant)'}</span>
                <ArrowRight className="w-5 h-5 text-orange-400" aria-hidden="true" />
              </Link>

              <Link
                href="/login"
                id="hero-login-btn"
                className="min-h-[48px] px-6 py-3.5 rounded-lg bg-slate-900/95 hover:bg-slate-800 text-orange-400 hover:text-orange-300 font-bold text-base flex items-center justify-center gap-2 border-2 border-orange-500/70 shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-orange-400"
              >
                <User className="w-5 h-5 text-orange-400" aria-hidden="true" />
                <span>{isAmharic ? 'ወደ መለያዎ ይግቡ' : 'Sign In to Account'}</span>
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

        {/* 4. FEATURED PROGRAMMES SECTION (Interactive & Usable) */}
        <section aria-labelledby="programmes-heading" className="py-16 px-4 sm:px-8 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <h2 id="programmes-heading" className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                  Featured Programmes
                </h2>
                <p className="text-base text-slate-600 max-w-2xl">
                  Every programme includes complete audio narration, screen-reader optimized exercises, keyboard-first navigation, and accessible live quizzes.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2" role="group" aria-label="Course tracks filter">
                <button
                  type="button"
                  onClick={() => setSelectedTrack('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                    selectedTrack === 'all'
                      ? 'bg-[#0B132B] text-orange-400 border border-orange-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Programmes
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTrack('data')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                    selectedTrack === 'data'
                      ? 'bg-[#0B132B] text-orange-400 border border-orange-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Data &amp; AI
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTrack('communication')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                    selectedTrack === 'communication'
                      ? 'bg-[#0B132B] text-orange-400 border border-orange-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Communication (WR 100)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTrack('va')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                    selectedTrack === 'va'
                      ? 'bg-[#0B132B] text-orange-400 border border-orange-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Virtual Assistant (VA-1)
                </button>
              </div>
            </div>

            {/* Course Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {filteredCourses.map((c) => (
                <article
                  key={c.id}
                  className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded-full">
                        {c.badge}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        {c.duration}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 leading-snug">
                      {c.title}
                    </h3>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-semibold text-slate-700 block">Skills gained:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {c.skills.map((skill) => (
                          <span
                            key={skill}
                            className="text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                      <span>{c.accessibleBadge}</span>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={c.link}
                        className="flex-1 py-2.5 px-3 rounded-lg bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 font-bold text-xs text-center border-2 border-orange-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
                      >
                        Explore Curriculum
                      </Link>
                      <Link
                        href="/register"
                        className="py-2.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
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

        {/* 5. ABOUT ABLEWAY ACCESSIBILITY SECTION (`#about`) */}
        <section id="about" aria-labelledby="about-heading" className="py-16 px-4 sm:px-8 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-widest bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                Inclusive Tech Education
              </span>
              <h2 id="about-heading" className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                Built for Blind and Visually Impaired Learners
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Ableway bridges the gap between digital curricula and assistive technologies, delivering full autonomy through voice, keyboard, and human support.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-orange-400 flex items-center justify-center border border-orange-500/50">
                  <Volume2 className="w-5 h-5 text-orange-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Hands-Free Assistant</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Start once and speak naturally. The assistant speaks slowly, confirms inputs, supports letter-by-letter spelling, and auto-listens without clicking.
                </p>
              </div>

              <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-orange-400 flex items-center justify-center border border-orange-500/50">
                  <Headphones className="w-5 h-5 text-orange-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Audio-First Lessons</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Structured audio narration, plain-language summaries, KaTeX math pronunciation, and earcon sound cues provide rich, non-visual context.
                </p>
              </div>

              <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-orange-400 flex items-center justify-center border border-orange-500/50">
                  <PhoneCall className="w-5 h-5 text-orange-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Human Helper Queue</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Stuck on a tricky concept or payment? Request staff assistance with 1-click or voice command for immediate human voice assistance.
                </p>
              </div>

              <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-3 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-orange-400 flex items-center justify-center border border-orange-500/50">
                  <ShieldCheck className="w-5 h-5 text-orange-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Zero Barrier Auth</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  No visual CAPTCHAs, no confusing puzzles. One-time codes sent to email or phone accept simple paste and screen reader autofill.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. CALL TO ACTION SECTION */}
        <section aria-labelledby="cta-heading" className="py-16 px-4 sm:px-8 bg-[#0B132B] text-white">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 id="cta-heading" className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to begin your accessible learning journey?
            </h2>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Create your account in minutes using our spoken assistant or keyboard navigation. Join hundreds of learners preparing for remote tech careers.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-base shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-orange-400 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
                <span>Create Your Account</span>
                <ArrowRight className="w-5 h-5 text-white" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-orange-400 hover:text-orange-300 font-bold text-base border-2 border-orange-500 shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-orange-400 flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5 text-orange-400" aria-hidden="true" />
                <span>Sign In with Existing Account</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 7. COMPLETE, PROFESSIONAL ACCESSIBLE FOOTER */}
      <footer className="bg-[#050B17] text-slate-300 border-t border-slate-800 pt-14 pb-8 px-4 sm:px-8" role="contentinfo">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Main Footer Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Col 1: Brand & Mission */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">
                  al<span className="text-orange-400">x</span>
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-lg font-bold text-white">Ableway</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Empowering blind and visually impaired learners across Africa with accessible AI, data analysis, and digital career skills.
              </p>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>WCAG 2.2 AA / AAA Compliant</span>
              </div>
            </div>

            {/* Col 2: Programmes */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Programmes
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <Link href="/courses" className="hover:text-orange-300 transition-colors">
                    Data Analytics
                  </Link>
                </li>
                <li>
                  <Link href="/courses" className="hover:text-orange-300 transition-colors">
                    WR 100: Workplace Communication
                  </Link>
                </li>
                <li>
                  <Link href="/courses" className="hover:text-orange-300 transition-colors">
                    VA-1: Virtual Assistant Foundations
                  </Link>
                </li>
                <li>
                  <Link href="/courses" className="hover:text-orange-300 transition-colors">
                    AI Career Accelerator
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Learner Navigation */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Learner Portal
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <Link href="/login" className="hover:text-orange-300 transition-colors">
                    Sign In (OTP Code)
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-orange-300 transition-colors">
                    Spoken Registration Assistant
                  </Link>
                </li>
                <li>
                  <Link href="/courses" className="hover:text-orange-300 transition-colors">
                    All Courses
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-orange-300 transition-colors">
                    Learner Profile &amp; Settings
                  </Link>
                </li>
                <li>
                  <Link href="/payment#human-help" className="hover:text-orange-300 transition-colors">
                    Human Helper Support Queue
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Accessibility & Support */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Accessibility &amp; Hotkeys
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <strong className="text-slate-200">Alt + V</strong>: Toggle Web Microphone
                </li>
                <li>
                  <strong className="text-slate-200">Alt + A</strong>: Open Spoken Assistant
                </li>
                <li>
                  <strong className="text-slate-200">Tab / Shift+Tab</strong>: Jump between controls
                </li>
                <li>
                  <strong className="text-slate-200">Zero CAPTCHA</strong>: Password-free sign-in
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Legal, Privacy & Copyright */}
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 Ableway &amp; ALX. All rights reserved. Built for barrier-free tech education.</p>
            <div className="flex items-center gap-4">
              <Link href="/register#privacy" className="hover:text-slate-300 transition-colors">
                Privacy Notice
              </Link>
              <span>•</span>
              <a href="#terms" className="hover:text-slate-300 transition-colors">
                Terms of Service
              </a>
              <span>•</span>
              <Link href="/payment#human-help" className="hover:text-slate-300 transition-colors">
                Accessibility Statement
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
