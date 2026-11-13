'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Sparkles, BookOpen, GraduationCap, CreditCard, User, HelpCircle, Layers, ShieldCheck } from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';

export function AccessibleHeader() {
  const pathname = usePathname();
  const { mode, theme, setTheme, fontSize, setFontSize } = useA11y();

  const navLinks = [
    { href: '/', label: 'Savanna Hub', icon: Layers },
    { href: '/register', label: 'Register', icon: Sparkles },
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/payment', label: 'Payment', icon: CreditCard },
    { href: '/learn', label: 'Learning Platform', icon: GraduationCap },
    { href: '/profile', label: 'Profile & Telegram', icon: User },
    { href: '/staff/help-queue', label: 'Staff Console', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1"
          >
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black">A</span>
            <span>Ableway</span>
          </a>
          <span className="hidden md:inline-block text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
            SRS v2.0
          </span>
        </div>

        {/* Primary Accessible Navigation */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center space-x-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                  isActive
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Accessibility Quick Toggles */}
        <div className="flex items-center gap-2">
          {/* Contrast Mode Selector */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Color Contrast Theme"
          >
            <option value="default">Standard Contrast</option>
            <option value="high-contrast">High Contrast</option>
            <option value="dark-contrast">Pure Black (OLED)</option>
            <option value="yellow-black">Yellow on Black</option>
          </select>

          {/* Text Size Selector */}
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Text Scaling"
          >
            <option value="normal">Normal Text (100%)</option>
            <option value="large">Large Text (125%)</option>
            <option value="x-large">Extra Large (150%)</option>
            <option value="xx-large">Maximum (170%)</option>
          </select>
        </div>
      </div>
    </header>
  );
}

