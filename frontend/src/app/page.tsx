'use client';

import React from 'react';
import { Sparkles, BookOpen, CreditCard, GraduationCap, Send, ShieldCheck, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  const learnerJourney = [
    {
      step: '1. Register',
      title: 'Spoken & Accessible Registration',
      description: 'Speak your details naturally. The assistant fills the form, reads it back, and confirms with you before submitting. Accessible sign-in with no CAPTCHAs.',
      href: '/register',
      icon: Sparkles,
      status: 'Ready',
    },
    {
      step: '2. Choose Course',
      title: 'Voice Course Catalog & Recommendation',
      description: 'Explore verified accessible courses. The assistant explains durations, levels, and prices, recommending the best course for your employment goals.',
      href: '/courses',
      icon: BookOpen,
      status: 'Ready',
    },
    {
      step: '3. Pay (Human-Assisted)',
      title: 'One-Click Human Helper Payment',
      description: 'No card numbers or mobile-money passwords needed. A dedicated staff helper calls or messages you to guide your payment safely.',
      href: '/payment',
      icon: CreditCard,
      status: 'Ready',
    },
    {
      step: '4. Learn',
      title: 'Accessible Learning Platform',
      description: 'Engage with structured modules, audio lessons with synchronized text transcripts, speed controls, voice-enabled quizzes, and assistant Q&A.',
      href: '/learn',
      icon: GraduationCap,
      status: 'Ready',
    },
    {
      step: '5. Link Telegram',
      title: 'Profile & One-Time Linking Code',
      description: 'Generate your secure 6-digit linking code to connect your account with the Telegram Assistant bot for job alerts and offline guidance.',
      href: '/profile',
      icon: Send,
      status: 'Ready',
    },
    {
      step: '6. Staff Console',
      title: 'Human Helper Queue & Admin',
      description: 'Real-time helper queue where staff view incoming assistance requests, accept tickets, take over live conversation, and confirm payments.',
      href: '/staff/help-queue',
      icon: ShieldCheck,
      status: 'Staff Only',
    },
  ];

  const savannaPages = [
    {
      name: 'Homepage V1 - Paced',
      description: 'Full ALX Savanna curriculum with weekly tracker and embedded voice-accessibility toolbar.',
      path: '/savanna?page=homepage-v1-paced.html',
      rawUrl: '/pages/homepage-v1-paced.html',
    },
    {
      name: 'Homepage V1 - Self Paced',
      description: 'Self-paced track with modular progress milestones and voice navigation.',
      path: '/savanna?page=homepage-v1-self-paced.html',
      rawUrl: '/pages/homepage-v1-self-paced.html',
    },
    {
      name: 'Concept with Navigation',
      description: 'Interactive concept lesson view with accessible focus states.',
      path: '/savanna?page=concept-with-navigation.html',
      rawUrl: '/pages/concept-with-navigation.html',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-3xl mx-auto" aria-labelledby="hero-heading">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          SRS Version 2.0 Track 3: Multilingual Assistant & Live Help
        </div>
        <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          Accessible Learning & Employment for Blind and Visually Impaired Learners
        </h1>
        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
          Navigate the entire learner journey by voice, keyboard, or screen reader. From spoken registration to human-assisted payment, interactive audio learning, and Telegram job alerts.
        </p>

        {/* Quick Voice Prompt Reminder */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="font-semibold text-emerald-400">💡 Voice Tip:</span>
          <span>Press <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-xs">Alt + V</kbd> anywhere or say <strong className="text-white">"Help"</strong> to activate the Web Assistant.</span>
        </div>
      </section>

      {/* Learner Journey Grid (SRS Section 2.1) */}
      <section aria-labelledby="journey-heading" className="space-y-6">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h2 id="journey-heading" className="text-2xl font-bold text-white flex items-center gap-2">
            <span>The 6-Step Learner Journey</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">SRS v2.0 Scope</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {learnerJourney.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.step}
                href={item.href}
                className="group p-6 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-600/60 rounded-2xl transition-all shadow-md flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">{item.step}</span>
                    <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">{item.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-white text-lg group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span>Enter {item.step}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* Savanna Learning Portal Integration */}
      <section aria-labelledby="savanna-heading" className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 id="savanna-heading" className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>Authentic ALX Savanna Portal Pages</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Preserved authentic Savanna design, integrated with the Ableway voice assistant toolbar, audio earcons, and WCAG AA accessibility controls.
            </p>
          </div>
          <a
            href="/savanna?page=homepage-v1-paced.html"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm self-start md:self-auto"
          >
            <span>Launch Savanna Portal</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {savannaPages.map((pg) => (
            <div key={pg.name} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-bold text-white text-base">{pg.name}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{pg.description}</p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <a
                  href={pg.path}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  View in Hub
                </a>
                <a
                  href={pg.rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 px-2 py-1.5"
                >
                  <span>Standalone Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
