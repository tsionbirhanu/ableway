'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useA11y } from '@/lib/a11y/a11y-context';
import { getTranslation } from '@/lib/i18n/translations';

export function AccessibleHeader() {
  const pathname = usePathname();
  const { language } = useA11y();

  const t = getTranslation(language);

  const isHomeActive = pathname === '/';
  const isCoursesActive = pathname === '/courses';
  const isLoginActive = pathname === '/login' || pathname === '/sign-in';

  return (
    <header
      className="sticky top-0 z-50 bg-[#0B132B]/80 backdrop-blur-md border-b border-white/10 shadow-sm transition-all"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand: alx | Ableway */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-lg px-1.5 py-1 min-h-[44px]"
            aria-label="Ableway homepage"
          >
            <span className="text-2xl font-black tracking-tight text-white font-sans">
              al<span className="text-orange-400">x</span>
            </span>
            <span className="text-slate-400 font-light text-base" aria-hidden="true">|</span>
            <span className="font-bold text-white tracking-tight text-base">Ableway</span>
          </Link>
          <span className="hidden sm:inline-block text-[11px] bg-white/10 text-orange-300 px-2.5 py-0.5 rounded-full font-medium backdrop-blur-sm">
            {t.nav?.accessibleLearning || 'Accessible Learning'}
          </span>
        </div>

        {/* Navigation Links: Home, Courses, About, Support */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          <Link
            href="/"
            className={`${
              isHomeActive ? 'text-orange-400' : 'text-slate-200 hover:text-white'
            } transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-lg px-2`}
            aria-current={isHomeActive ? 'page' : undefined}
          >
            {t.nav?.home || 'Home'}
          </Link>
          <Link
            href="/courses"
            className={`${
              isCoursesActive ? 'text-orange-400' : 'text-slate-200 hover:text-white'
            } transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-lg px-2`}
            aria-current={isCoursesActive ? 'page' : undefined}
          >
            {t.nav?.courses || 'Courses'}
          </Link>
          <Link
            href="/#about"
            className="text-slate-200 hover:text-white transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-lg px-2"
          >
            {t.nav?.about || 'About'}
          </Link>
          <Link
            href="/payment#human-help"
            className="text-slate-200 hover:text-white transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-lg px-2"
          >
            {t.nav?.support || 'Support'}
          </Link>
        </nav>

        {/* Right Side: ONLY the Login Button (no stroke, polished glass aesthetic) */}
        <div className="flex items-center">
          <Link
            href="/login"
            id="top-nav-login"
            className={`min-h-[44px] px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 flex items-center justify-center cursor-pointer ${
              isLoginActive
                ? 'bg-orange-500 text-white shadow-orange-500/20'
                : 'bg-orange-500 hover:bg-orange-400 text-white hover:shadow-md'
            }`}
            aria-current={isLoginActive ? 'page' : undefined}
          >
            <span>{t.nav?.login || 'Login'}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
