import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { A11yProvider } from '@/lib/a11y/a11y-context';
import { LiveAnnouncer } from '@/lib/a11y/live-announcer';
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
  title: 'Ableway | Accessible Learning and Employment Platform (SRS v2.0)',
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
          {/* Accessible Skip Link (WCAG 2.2 AA) */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none"
          >
            Skip to main content
          </a>

          {/* ARIA Live Region Announcer for Screen Readers (FR-1.9) */}
          <LiveAnnouncer />

          {/* Persistent Accessible Top Header */}
          <Suspense fallback={<div className="h-16 bg-slate-900 border-b border-slate-800" />}>
            <AccessibleHeader />
          </Suspense>

          {/* Main Content Area */}
          <main id="main-content" className="flex-1 flex flex-col focus:outline-none" tabIndex={-1}>
            {children}
          </main>

          {/* Persistent Web Assistant Control on Every Page (FR-1.1) */}
          <Suspense fallback={null}>
            <WebAssistantPanel />
          </Suspense>
        </A11yProvider>
      </body>
    </html>
  );
}
