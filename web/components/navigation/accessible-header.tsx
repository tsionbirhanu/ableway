'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Sparkles, Globe, Settings } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { getTranslation } from '@/lib/i18n/translations';
import { QuickSettingsDialog } from '@/components/a11y/quick-settings-dialog';

export function AccessibleHeader() {
  const pathname = usePathname();
  const { language, toggleLanguage } = useA11y();
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);

  const t = getTranslation(language);
  const isAmharic = language === 'am-ET' || language === 'am';

  const isHomeActive = pathname === '/';
  const isCoursesActive = pathname === '/courses';
  const isLoginActive = pathname === '/login';
  const isRegisterActive = pathname === '/register';

  return (
    <header
      className="sticky top-0 z-40 bg-[#0B132B] text-white border-b border-slate-800 shadow-md"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand: alx | Ableway */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1 min-h-[44px]"
          >
            <span className="text-2xl font-black tracking-tight text-white font-sans">
              al<span className="text-orange-400">x</span>
            </span>
            <span className="text-slate-400 font-light text-base">|</span>
            <span className="font-bold text-white tracking-tight text-base">Ableway</span>
          </Link>
          <span className="hidden sm:inline-block text-[11px] bg-slate-800 text-orange-300 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
            {t.nav?.accessibleLearning || 'Accessible Learning'}
          </span>
        </div>

        {/* Necessary Links Only: Home, Courses, About, Support */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          <Link
            href="/"
            className={`${
              isHomeActive ? 'text-orange-400' : 'text-slate-200 hover:text-white'
            } transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1`}
            aria-current={isHomeActive ? 'page' : undefined}
          >
            {t.nav?.home || 'Home'}
          </Link>
          <Link
            href="/courses"
            className={`${
              isCoursesActive ? 'text-orange-400' : 'text-slate-200 hover:text-white'
            } transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1`}
            aria-current={isCoursesActive ? 'page' : undefined}
          >
            {t.nav?.courses || 'Courses'}
          </Link>
          <Link
            href="/#about"
            className="text-slate-200 hover:text-white transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1"
          >
            {t.nav?.about || 'About'}
          </Link>
          <Link
            href="/payment#human-help"
            className="text-slate-200 hover:text-white transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1"
          >
            {t.nav?.support || 'Support'}
          </Link>
        </nav>

        {/* Action Buttons: Quick Settings + Language Switch + Login + Register */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Settings Dialog Trigger */}
          <button
            ref={settingsTriggerRef}
            type="button"
            onClick={() => setIsQuickSettingsOpen(true)}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
            aria-label="Open Quick Accessibility Settings Dialog (Alt+Shift+S)"
            aria-haspopup="dialog"
          >
            <Settings className="w-4 h-4 text-orange-400" aria-hidden="true" />
          </button>

          {/* Language Switch Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            id="top-nav-lang-toggle"
            aria-label={`${isAmharic ? 'አማ (AM)' : 'EN (US)'}: Switch language / ቋንቋ ቀይር`}
            title={isAmharic ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs border border-orange-500/80 bg-slate-900 hover:bg-slate-800 text-orange-400 hover:text-orange-300 flex items-center gap-1.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span>{isAmharic ? 'አማ (AM)' : 'EN (US)'}</span>
          </button>

          {/* Login Button */}
          <Link
            href="/login"
            id="top-nav-login"
            className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm border transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center gap-1.5 ${
              isLoginActive
                ? 'bg-[#0B132B] text-orange-400 border-2 border-orange-500 shadow-md ring-1 ring-orange-400/40'
                : 'bg-slate-900 hover:bg-slate-800 text-orange-400 hover:text-orange-300 border border-orange-500/70 shadow-sm'
            }`}
            aria-current={isLoginActive ? 'page' : undefined}
          >
            <User className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span>{t.nav?.login || 'Login'}</span>
          </Link>

          {/* Register Button */}
          <Link
            href="/register"
            id="top-nav-register"
            className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm border transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center gap-1.5 ${
              isRegisterActive
                ? 'bg-[#0B132B] text-orange-400 border-2 border-orange-500 shadow-md ring-1 ring-orange-400/40'
                : 'bg-[#0B132B] hover:bg-[#131E3D] text-orange-400 hover:text-orange-300 border-2 border-orange-500 shadow-md'
            }`}
            aria-current={isRegisterActive ? 'page' : undefined}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span>{t.nav?.register || 'Register'}</span>
          </Link>
        </div>
      </div>

      {/* Quick Settings Dialog */}
      <QuickSettingsDialog
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        triggerRef={settingsTriggerRef}
      />
    </header>
  );
}
