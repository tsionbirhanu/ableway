import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { A11yProvider } from "@/core/a11y/a11y-context";
import { LiveAnnouncer } from "@/core/a11y/live-announcer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ableway | Accessible Voice-Assisted Learning & Employment",
  description:
    "An accessible voice-assisted learning and employment platform for blind and visually impaired users.",
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
          <LiveAnnouncer />
          {children}
        </A11yProvider>
      </body>
    </html>
  );
}
