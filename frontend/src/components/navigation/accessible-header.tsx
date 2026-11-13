'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, BookOpen, GraduationCap, CreditCard, User, HelpCircle, Layers, ShieldCheck } from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';

export function AccessibleHeader() {
  const pathname = usePathname();
  const { theme, setTheme, fontSize, setFontSize } = useA11y();

  const navLinks = [
    { href: '/', label: 'Hub', icon: Layers },
    { href: '/register', label: 'Register', icon: Sparkles },
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/payment', label: 'Payment', icon: CreditCard },
    { href: '/learn', label: 'Learn', icon: GraduationCap },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/staff/help-queue', label: 'Staff Queue', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded min-h-[44px] px-2"
          >
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black" aria-hidden="true">A</span>
            <span>Ableway</span>
          </a>
        </div>

        {/* Primary Accessible Navigation (Rule 3) */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center space-x-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <a
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
              </a>
            );
          })}
        </nav>

        {/* Accessibility Quick Toggles & Persistent Help Link (Rule 3 & Rule 12) */}
        <div className="flex items-center gap-2">
          {/* Rule 3: Help Link in the same place on every page */}
          <a
            href="/profile#help-shortcuts"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold min-h-[44px] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title="Help and Keyboard Shortcuts"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span className="hidden sm:inline">Help</span>
          </a>

          {/* Contrast Mode Selector */}
          <label htmlFor="header-contrast-select" className="sr-only">Color Contrast Theme</label>
          <select
            id="header-contrast-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-100 rounded-lg px-2 py-1.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="default">Standard</option>
            <option value="high-contrast">High Contrast</option>
            <option value="dark-contrast">Pure Black</option>
            <option value="yellow-black">Yellow / Black</option>
          </select>

          {/* Text Size Selector */}
          <label htmlFor="header-text-size-select" className="sr-only">Text Scaling Size</label>
          <select
            id="header-text-size-select"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-100 rounded-lg px-2 py-1.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="normal">Text: 100%</option>
            <option value="large">Text: 125%</option>
            <option value="x-large">Text: 150%</option>
            <option value="xx-large">Text: 180%</option>
          </select>
        </div>
      </div>
    </header>
  );
}
