'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Sparkles, Globe } from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';

export function AccessibleHeader() {
  const pathname = usePathname();
  const { language, toggleLanguage } = useA11y();

  // If on the home page, home page renders its own hero navigation
  if (pathname === '/') {
    return null;
  }

  const isLoginActive = pathname === '/login';
  const isRegisterActive = pathname === '/register';
  const isCoursesActive = pathname === '/courses';

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
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded px-1"
          >
            <span className="text-2xl font-black tracking-tight text-white font-sans">
              al<span className="text-orange-400">x</span>
            </span>
            <span className="text-slate-400 font-light text-base">|</span>
            <span className="font-bold text-white tracking-tight text-base">Ableway</span>
          </Link>
          <span className="hidden sm:inline-block text-[11px] bg-slate-800 text-orange-300 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
            Accessible Learning
          </span>
        </div>

        {/* Necessary Links Only */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          <Link
            href="/"
            className="text-slate-200 hover:text-white transition-colors"
          >
            Home
          </Link>
          <Link
            href="/courses"
            className={`${isCoursesActive
                ? 'text-orange-400'
                : 'text-slate-200 hover:text-white'
              } transition-colors`}
          >
            Courses
          </Link>
          <Link
            href="/payment#human-help"
            className="text-slate-200 hover:text-white transition-colors"
          >
            Support
          </Link>
        </nav>

        {/* Simple Action Buttons: Language Switch + Navy Blue with Bold Orange Text */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Language Switch Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            id="nav-lang-toggle"
            aria-label={`${language === 'am-ET' ? 'አማ (AM)' : 'EN (US)'}: Switch language / ቋንቋ ቀይር`}
            title={language === 'am-ET' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs border border-orange-500/80 bg-slate-900 hover:bg-slate-800 text-orange-400 hover:text-orange-300 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span>{language === 'am-ET' ? 'አማ (AM)' : 'EN (US)'}</span>
          </button>

          <Link
            href="/login"
            id="nav-login-btn"
            className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center gap-1.5 ${isLoginActive
                ? 'bg-[#0B132B] text-orange-400 border-2 border-orange-500 shadow-md ring-1 ring-orange-400/40'
                : 'bg-slate-900 hover:bg-slate-800 text-orange-400 hover:text-orange-300 border-orange-500/70 shadow-sm'
              }`}
            aria-current={isLoginActive ? 'page' : undefined}
          >
            <User className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span>Login</span>
          </Link>
          <Link
            href="/register"
            id="nav-register-btn"
            className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center gap-1.5 ${isRegisterActive
                ? 'bg-[#0B132B] text-orange-400 border-2 border-orange-500 shadow-md ring-1 ring-orange-400/40'
                : 'bg-slate-900 hover:bg-slate-800 text-orange-400 hover:text-orange-300 border-orange-500/70 shadow-sm'
              }`}
            aria-current={isRegisterActive ? 'page' : undefined}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span>Register</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
