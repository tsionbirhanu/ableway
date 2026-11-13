'use client';

import React from 'react';
import { Sparkles, BookOpen, CreditCard, GraduationCap, Send, ShieldCheck, ExternalLink, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const learnerJourney = [
    {
      step: 'Step 1',
      title: '1. Register',
      description: 'Speak your details naturally. The assistant fills the form, reads it back, and confirms with you before saving. No CAPTCHAs.',
      href: '/register',
      icon: Sparkles,
      status: 'Ready',
    },
    {
      step: 'Step 2',
      title: '2. Choose Course',
      description: 'Explore verified courses. The assistant explains durations, levels, and prices, and recommends the best course for your goals.',
      href: '/courses',
      icon: BookOpen,
      status: 'Ready',
    },
    {
      step: 'Step 3',
      title: '3. Pay (Human Help)',
      description: 'No card numbers or mobile-money passwords needed. A dedicated staff helper calls or messages you to guide your payment safely.',
      href: '/payment',
      icon: CreditCard,
      status: 'Ready',
    },
    {
      step: 'Step 4',
      title: '4. Learn',
      description: 'Engage with structured modules, audio lessons with synchronized text transcripts, speed controls, voice-enabled quizzes, and assistant Q&A.',
      href: '/learn',
      icon: GraduationCap,
      status: 'Ready',
    },
    {
      step: 'Step 5',
      title: '5. Link Telegram',
      description: 'Generate your secure 6-digit linking code to connect your account with the Telegram Assistant bot for job alerts and offline guidance.',
      href: '/profile',
      icon: Send,
      status: 'Ready',
    },
    {
      step: 'Step 6',
      title: '6. Staff Console',
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
      {/* Hero Section (Rule 2: Exactly one h1) */}
      <section className="text-center space-y-4 max-w-3xl mx-auto" aria-labelledby="hero-heading">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-full text-xs font-bold">
          <span>SRS Version 2.0: Track 3 Multilingual Assistant</span>
        </div>
        <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          Accessible Learning & Employment for Blind and Visually Impaired Learners
        </h1>
        <p className="text-slate-200 text-base sm:text-lg leading-relaxed">
          Navigate your learning journey by voice, keyboard, or screen reader. From spoken registration to human-assisted payment, interactive audio lessons, and Telegram job alerts.
        </p>

        {/* Quick Voice Prompt Reminder */}
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-slate-200 flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="font-bold text-emerald-400">Voice Shortcut:</span>
          <span>Press <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-600 font-mono text-xs text-white">Alt + Shift + V</kbd> anywhere or say <strong className="text-white">&quot;Help&quot;</strong> to activate the Web Assistant.</span>
        </div>
      </section>

      {/* Learner Journey Section (Rule 1 & 24: semantic ul & li) */}
      <section aria-labelledby="journey-heading" className="space-y-6">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h2 id="journey-heading" className="text-2xl font-bold text-white">
            The 6-Step Learner Journey
          </h2>
          <span className="text-xs text-slate-300 font-mono font-medium">SRS v2.0 Scope</span>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0 m-0">
          {learnerJourney.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.step}>
                <a
                  href={item.href}
                  className="group p-6 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-emerald-500 rounded-3xl transition-all shadow-md flex flex-col justify-between h-full min-h-[220px] focus:outline-none focus:ring-4 focus:ring-emerald-400"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">{item.step}</span>
                      <span className="text-xs bg-slate-800 text-slate-200 px-2.5 py-0.5 rounded-full border border-slate-600 font-semibold">{item.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-950 border border-emerald-700 rounded-xl text-emerald-400">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <h3 className="font-bold text-white text-lg group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span>Enter {item.title}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Savanna Learning Portal Integration */}
      <section aria-labelledby="savanna-heading" className="p-6 sm:p-8 bg-slate-900 border border-slate-700 rounded-3xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 id="savanna-heading" className="text-xl sm:text-2xl font-bold text-white">
              Authentic ALX Savanna Portal Pages
            </h2>
            <p className="text-sm text-slate-200 mt-1">
              Preserved authentic Savanna design, integrated with the Ableway voice assistant toolbar, audio earcons, and WCAG AA accessibility controls.
            </p>
          </div>
          <a
            href="/savanna?page=homepage-v1-paced.html"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-5 py-3 rounded-xl min-h-[44px] transition-colors shadow-sm self-start md:self-auto"
          >
            <span>Launch Savanna Portal</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0 m-0">
          {savannaPages.map((pg) => (
            <li key={pg.name} className="p-4 bg-slate-950 border border-slate-700 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-bold text-white text-base">{pg.name}</h3>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">{pg.description}</p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <a
                  href={pg.path}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg font-bold min-h-[44px] flex items-center transition-colors border border-slate-600"
                >
                  View in Hub
                </a>
                <a
                  href={pg.rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-200 hover:text-emerald-400 flex items-center gap-1 px-3 py-2 min-h-[44px]"
                >
                  <span>Standalone Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
