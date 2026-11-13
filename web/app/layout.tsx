import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { A11yProvider } from '@/lib/a11y/a11y-context';
import { LiveAnnouncer } from '@/lib/a11y/live-announcer';
import { RouteFocusAnnouncer } from '@/lib/a11y/route-focus-announcer';
import { AccessibleHeader } from '@/components/navigation/accessible-header';
import { WebAssistantPanel } from '@/components/assistant/web-assistant-panel';
import { SessionTimeoutWarning } from '@/components/a11y/session-timeout-warning';
import { SkipLink } from '@/components/ui/skip-link';

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
          {/* Rule 2: Skip link to main as the first focusable element */}
          <SkipLink />

          {/* Rule 19: Shared ARIA Live Region */}
          <LiveAnnouncer />

          {/* Rule 7: Route Focus & Page Announcement */}
          <Suspense fallback={null}>
            <RouteFocusAnnouncer />
          </Suspense>

          {/* Rule 2 & 3: Header (Logo, Main Navigation, Language Switcher, Settings, "Get help" Link) */}
          <Suspense fallback={<div className="h-16 bg-slate-900 border-b border-slate-800" />}>
            <AccessibleHeader />
          </Suspense>

          {/* Rule 2: Landmark Main Content Area */}
          <main id="main-content" className="flex-1 flex flex-col focus:outline-none" tabIndex={-1}>
            {children}
          </main>

          {/* Rule 2 & 3: Landmark Footer */}
          <footer className="bg-slate-900 border-t border-slate-800 text-slate-300 py-6 px-4 sm:px-6 lg:px-8 mt-auto" role="contentinfo">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <p>© 2026 Ableway Platform. Standard: WCAG 2.2 AA / AAA.</p>
              <nav aria-label="Footer Accessibility & Help" className="flex flex-wrap items-center gap-6">
                <a
                  href="/help"
                  className="text-slate-200 hover:text-white underline focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1 min-h-[44px] flex items-center"
                >
                  Get Help & Shortcuts
                </a>
                <a
                  href="/settings"
                  className="text-slate-200 hover:text-white underline focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1 min-h-[44px] flex items-center"
                >
                  Accessibility Settings
                </a>
                <a
                  href="/payment#human-help"
                  className="text-emerald-400 hover:text-emerald-300 underline focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1 min-h-[44px] flex items-center"
                >
                  Call a Person (Human Helper)
                </a>
              </nav>
            </div>
          </footer>

          {/* Rule 18: Session Timeout Warning Dialog */}
          <SessionTimeoutWarning />

          {/* Rule 8 & 20: Persistent Web Assistant Control */}
          <Suspense fallback={null}>
            <WebAssistantPanel />
          </Suspense>
        </A11yProvider>
      </body>
    </html>
  );
}
