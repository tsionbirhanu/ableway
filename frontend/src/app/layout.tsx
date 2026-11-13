import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { A11yProvider } from '@/core/a11y/a11y-context';
import { LiveAnnouncer } from '@/core/a11y/live-announcer';
import { RouteFocusAnnouncer } from '@/core/a11y/route-focus-announcer';
import { AccessibleHeader } from '@/components/navigation/accessible-header';
import { WebAssistantPanel } from '@/components/assistant/web-assistant-panel';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Ableway | Accessible Learning and Employment Platform',
  description:
    'AI-Assisted Learning and Employment Platform for Blind and Visually Impaired Learners: Web Assistant and Telegram Assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <A11yProvider>
          {/* Rule 2: Accessible Skip Link (First focusable element, never hidden when focused) */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-emerald-600 focus:text-white focus:font-bold focus:rounded-xl focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-300"
          >
            Skip to main content
          </a>

          {/* Rule 19: Shared ARIA Live Region */}
          <LiveAnnouncer />

          {/* Rule 7: Route Focus & Page Announcement */}
          <Suspense fallback={null}>
            <RouteFocusAnnouncer />
          </Suspense>

          {/* Rule 2 & 3: Landmark Header with Consistent Navigation */}
          <Suspense fallback={<div className="h-16 bg-slate-900 border-b border-slate-800" />}>
            <AccessibleHeader />
          </Suspense>

          {/* Rule 2: Landmark Main Content Area */}
          <main id="main-content" className="flex-1 flex flex-col focus:outline-none" tabIndex={-1}>
            {children}
          </main>

          {/* Rule 2 & 3: Landmark Footer with Consistent Help Link */}
          <footer className="bg-slate-900 border-t border-slate-800 text-slate-300 py-6 px-4 sm:px-6 lg:px-8 mt-auto" role="contentinfo">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <p>© 2026 Ableway Platform. Built to WCAG 2.2 AA / AAA standards.</p>
              <nav aria-label="Footer Accessibility & Help" className="flex items-center gap-6">
                <a
                  href="/profile#help-shortcuts"
                  className="text-slate-200 hover:text-white underline focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1 min-h-[44px] flex items-center"
                >
                  Keyboard Shortcuts & Help (Alt+Shift+H)
                </a>
                <a
                  href="/payment#human-help"
                  className="text-emerald-400 hover:text-emerald-300 underline focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1 min-h-[44px] flex items-center"
                >
                  Call Human Helper (Alt+Shift+T)
                </a>
              </nav>
            </div>
          </footer>

          {/* Rule 8 & 20: Web Assistant Panel */}
          <Suspense fallback={null}>
            <WebAssistantPanel />
          </Suspense>
        </A11yProvider>
      </body>
    </html>
  );
}
