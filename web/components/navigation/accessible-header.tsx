'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, BookOpen, GraduationCap, CreditCard, User, HelpCircle, Layers, ShieldCheck, Settings, Globe } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { QuickSettingsDialog } from '@/components/a11y/quick-settings-dialog';

export function AccessibleHeader() {
  const pathname = usePathname();
  const { language, setLanguage, announce } = useA11y();
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);

  const navLinks = [
    { href: '/', label: 'Home', icon: Layers },
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/learn', label: 'Learn', icon: GraduationCap },
    { href: '/payment', label: 'Payment', icon: CreditCard },
    { href: '/login', label: 'Sign In', icon: User },
    { href: '/register', label: 'Register', icon: Sparkles },
    { href: '/staff/help-queue', label: 'Staff Queue', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* 1. Logo */}
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
            Accessible Learning
          </span>
        </div>

        {/* 2. Main Navigation */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center space-x-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                  isActive
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Controls: Language Switcher, Settings, and "Get Help" Link */}
        <div className="flex items-center gap-2">
          {/* 3. Language Switcher */}
          <div className="flex items-center gap-1">
            <Globe className="w-4 h-4 text-slate-400 hidden sm:inline" aria-hidden="true" />
            <label htmlFor="header-language-select" className="sr-only">Switch Language</label>
            <select
              id="header-language-select"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                announce(`Language changed to ${e.target.value}`);
              }}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-100 rounded-lg px-2 py-1.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="en">English (EN)</option>
              <option value="am">አማርኛ (AM)</option>
              <option value="om">Afaan Oromoo (OM)</option>
            </select>
          </div>

          {/* 4. Settings Trigger */}
          <button
            ref={settingsTriggerRef}
            type="button"
            onClick={() => setIsQuickSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold min-h-[44px] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Open Quick Accessibility Settings Dialog (Alt+Shift+S)"
            aria-haspopup="dialog"
          >
            <Settings className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* 5. "Get Help" Link (Rule 3: Same place on every page) */}
          <Link
            href="/help"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold min-h-[44px] shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title="Get Help & Keyboard Shortcuts"
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            <span>Get help</span>
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
