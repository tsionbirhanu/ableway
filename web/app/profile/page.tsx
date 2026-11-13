'use client';

import React, { useState } from 'react';
import { Send, KeyRound, Shield, CheckCircle2, Trash2, Bell, User, Settings } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';

export default function ProfilePage() {
  const { announce, mode, setMode, theme, setTheme, fontSize, setFontSize } = useA11y();

  const [oneTimeCode, setOneTimeCode] = useState<string | null>(null);
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(300);
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [alertTelegram, setAlertTelegram] = useState(true);
  const [alertSMS, setAlertSMS] = useState(false);
  const [jobInterests, setJobInterests] = useState('Customer support, accessibility testing, remote transcription');

  const handleGenerateLinkCode = () => {
    // Generates a 6-digit random code valid for 5 minutes (FR-6.3)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOneTimeCode(code);
    setCodeExpiresIn(300);
    announce(`Your one-time Telegram linking code is ${code.split('').join(' ')}. Send this code to the Ableway Telegram bot using the command slash link space ${code}.`);
  };

  const handleSimulateBotLinked = () => {
    setIsLinked(true);
    setOneTimeCode(null);
    announce('Telegram account linked successfully! You will now receive job alerts directly in Telegram.');
  };

  const handleUnlink = () => {
    setIsLinked(false);
    announce('Telegram account has been disconnected. All Telegram alerts have stopped.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
          <span>FR-6.1 to FR-6.6: Profile & Telegram Account Linking</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Learner Profile & Integrations</h1>
        <p className="text-slate-300 text-sm">
          Manage your personal information, accessibility preferences, and connect your Telegram account for mobile job alerts.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Accessibility & Alert Settings */}
        <div className="space-y-6">
          <section aria-labelledby="a11y-prefs-heading" className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
            <h2 id="a11y-prefs-heading" className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              <span>Accessibility Preferences</span>
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Interaction Mode:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'voice-first', label: 'Voice-First' },
                    { id: 'screen-reader', label: 'Screen Reader' },
                    { id: 'hybrid', label: 'Hybrid' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as any)}
                      className={`p-2 rounded-xl text-xs font-semibold border ${
                        mode === m.id
                          ? 'bg-emerald-700 border-emerald-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contrast Theme:</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="default">Standard Contrast</option>
                  <option value="high-contrast">High Contrast</option>
                  <option value="dark-contrast">Pure Black (OLED)</option>
                  <option value="yellow-black">Yellow on Black</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Text Sizing:</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="normal">Normal (100%)</option>
                  <option value="large">Large (125%)</option>
                  <option value="x-large">Extra Large (150%)</option>
                  <option value="xx-large">Maximum (170%)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Job Alerts & Notification Channels (FR-6.6) */}
          <section aria-labelledby="alerts-heading" className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
            <h2 id="alerts-heading" className="text-lg font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-400" />
              <span>Job Alerts & Channels</span>
            </h2>

            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertTelegram}
                  onChange={(e) => setAlertTelegram(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-700"
                />
                <span className="text-slate-200 text-xs">Receive instant alerts via Telegram Bot</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertSMS}
                  onChange={(e) => setAlertSMS(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-700"
                />
                <span className="text-slate-200 text-xs">Receive SMS job alerts (when available)</span>
              </label>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Job Keywords of Interest:</label>
                <input
                  type="text"
                  value={jobInterests}
                  onChange={(e) => setJobInterests(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Telegram Account Linking (FR-6.2 - FR-6.5) */}
        <section aria-labelledby="telegram-link-heading" className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-6 h-6 text-emerald-400" />
              <h2 id="telegram-link-heading" className="text-xl font-bold text-white">Telegram Assistant Linking</h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Connect your account with the official <strong>@AblewayBot</strong> on Telegram. This allows the bot to recognize your enrollment, read your course alerts, and deliver tailored accessible job matches directly into your Telegram inbox.
            </p>

            {/* Linking Consent Warning (FR-6.4) */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Explicit Consent & Scope</span>
              </span>
              <p>
                Linking only grants @AblewayBot permission to send you job updates and messages you explicitly request. The bot <strong>CANNOT</strong> view or read your other private Telegram conversations (see SRS Section 3.2).
              </p>
            </div>

            {/* Active Link Status or Code Generator */}
            {isLinked ? (
              <div className="p-4 bg-emerald-950/70 border border-emerald-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Telegram Connected (@LearnerAccount)</span>
                </div>
                <p className="text-xs text-slate-300">
                  Your Telegram ID is securely linked. Job alerts and course summaries are delivered to your Telegram app.
                </p>
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="w-full py-2 px-3 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Unlink Telegram Account</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {!oneTimeCode ? (
                  <button
                    type="button"
                    onClick={handleGenerateLinkCode}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Generate One-Time Linking Code</span>
                  </button>
                ) : (
                  <div className="p-4 bg-slate-950 border border-emerald-500 rounded-2xl space-y-3 text-center">
                    <span className="text-xs font-mono text-emerald-400 uppercase">Your One-Time Code:</span>
                    <p className="text-3xl font-mono font-black text-white tracking-widest">{oneTimeCode}</p>
                    <p className="text-xs text-slate-400">
                      Open Telegram, search for <strong>@AblewayBot</strong>, and send:
                      <br />
                      <code className="text-emerald-300 font-bold font-mono">/link {oneTimeCode}</code>
                    </p>
                    <button
                      type="button"
                      onClick={handleSimulateBotLinked}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-3 rounded-lg border border-slate-700"
                    >
                      [Demo] Simulate Bot Verified Code
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
