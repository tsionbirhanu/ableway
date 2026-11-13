'use client';

import React, { useState } from 'react';
import { Send, KeyRound, Shield, CheckCircle2, Trash2, Bell, User, Settings, HelpCircle, Clock } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';

export default function ProfilePage() {
  const { announce, mode, setMode, theme, setTheme, fontSize, setFontSize } = useA11y();

  const [oneTimeCode, setOneTimeCode] = useState<string | null>(null);
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(300);
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [alertTelegram, setAlertTelegram] = useState(true);
  const [alertSMS, setAlertSMS] = useState(false);
  const [jobInterests, setJobInterests] = useState('Customer support, accessibility testing, remote transcription');
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);

  const handleGenerateLinkCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOneTimeCode(code);
    setCodeExpiresIn(300);
    announce(`Your one-time Telegram linking code is ${code.split('').join(' ')}. It is valid for 5 minutes. You can extend it anytime.`, 'polite');
  };

  // Rule 18: Allow user to extend expiring codes
  const handleExtendCode = () => {
    setCodeExpiresIn((prev) => prev + 300);
    announce('Code expiration extended by 5 minutes.', 'polite');
  };

  const handleSimulateBotLinked = () => {
    setIsLinked(true);
    setOneTimeCode(null);
    announce('Telegram account linked successfully! You will now receive job alerts directly in Telegram.', 'polite');
  };

  const handleUnlink = () => {
    setIsLinked(false);
    announce('Telegram account disconnected. All Telegram alerts have stopped.', 'polite');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Title & Heading (Rule 2) */}
      <header className="space-y-2">
        <h1 id="profile-h1" className="text-3xl font-extrabold text-white">
          Learner Profile & Settings
        </h1>
        <p className="text-slate-200 text-sm">
          Manage your accessibility preferences, view keyboard shortcuts, and connect your Telegram account for mobile job alerts.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Accessibility & Alert Settings */}
        <div className="space-y-6">
          <section aria-labelledby="a11y-prefs-heading" className="p-6 bg-slate-900 border border-slate-700 rounded-3xl space-y-4">
            <h2 id="a11y-prefs-heading" className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <span>Accessibility Preferences</span>
            </h2>

            <div className="space-y-4 text-sm">
              {/* Interaction Mode (Rule 20) */}
              <div>
                <span className="block text-xs font-bold text-slate-200 mb-1.5">Assistant Mode:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'voice-first', label: 'Voice Mode' },
                    { id: 'screen-reader', label: 'Screen Reader' },
                    { id: 'hybrid', label: 'Hybrid' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMode(m.id as any);
                        announce(`Switched to ${m.label}.`);
                      }}
                      className={`p-2.5 rounded-xl text-xs font-bold border min-h-[44px] transition-colors ${
                        mode === m.id
                          ? 'bg-emerald-700 border-emerald-400 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-600'
                      }`}
                      aria-pressed={mode === m.id}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contrast Theme (Rule 10 & 11) */}
              <div>
                <label htmlFor="profile-theme-select" className="block text-xs font-bold text-slate-200 mb-1">
                  Contrast Theme:
                </label>
                <select
                  id="profile-theme-select"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="default">Standard Contrast (4.5:1)</option>
                  <option value="high-contrast">High Contrast (7:1+)</option>
                  <option value="dark-contrast">Pure Black (OLED)</option>
                  <option value="yellow-black">Yellow on Black</option>
                </select>
              </div>

              {/* Text Sizing (Rule 11) */}
              <div>
                <label htmlFor="profile-font-select" className="block text-xs font-bold text-slate-200 mb-1">
                  Text Sizing:
                </label>
                <select
                  id="profile-font-select"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="normal">Normal (100%)</option>
                  <option value="large">Large (125%)</option>
                  <option value="x-large">Extra Large (150%)</option>
                  <option value="xx-large">Maximum (180%)</option>
                </select>
              </div>

              {/* Rule 9: Switchable Shortcuts */}
              <div className="pt-2">
                <label htmlFor="shortcuts-toggle" className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                  <input
                    id="shortcuts-toggle"
                    type="checkbox"
                    checked={shortcutsEnabled}
                    onChange={(e) => {
                      setShortcutsEnabled(e.target.checked);
                      announce(e.target.checked ? 'Keyboard shortcuts enabled.' : 'Keyboard shortcuts turned off.');
                    }}
                    className="w-5 h-5 rounded text-emerald-600 bg-slate-950 border-slate-700"
                  />
                  <span className="text-xs text-slate-100 font-medium">Enable Global Keyboard Shortcuts</span>
                </label>
              </div>
            </div>
          </section>

          {/* Job Alerts (Rule 15: native label & inputs) */}
          <section aria-labelledby="alerts-heading" className="p-6 bg-slate-900 border border-slate-700 rounded-3xl space-y-4">
            <h2 id="alerts-heading" className="text-lg font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <span>Job Alerts & Channels</span>
            </h2>

            <div className="space-y-3 text-sm">
              <label htmlFor="pref-alert-telegram" className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                <input
                  id="pref-alert-telegram"
                  type="checkbox"
                  checked={alertTelegram}
                  onChange={(e) => setAlertTelegram(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-600 bg-slate-950 border-slate-700"
                />
                <span className="text-slate-200 text-xs font-medium">Receive instant alerts via Telegram Bot</span>
              </label>

              <label htmlFor="pref-alert-sms" className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                <input
                  id="pref-alert-sms"
                  type="checkbox"
                  checked={alertSMS}
                  onChange={(e) => setAlertSMS(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-600 bg-slate-950 border-slate-700"
                />
                <span className="text-slate-200 text-xs font-medium">Receive SMS alerts (when available)</span>
              </label>

              <div className="pt-2">
                <label htmlFor="job-keywords-input" className="block text-xs font-bold text-slate-200 mb-1">
                  Job Keywords of Interest:
                </label>
                <input
                  id="job-keywords-input"
                  type="text"
                  value={jobInterests}
                  onChange={(e) => setJobInterests(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Telegram Account Linking & Keyboard Shortcuts Help */}
        <div className="space-y-6">
          <section aria-labelledby="telegram-link-heading" className="p-6 bg-slate-900 border border-slate-700 rounded-3xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Send className="w-6 h-6 text-emerald-400" aria-hidden="true" />
                <h2 id="telegram-link-heading" className="text-xl font-bold text-white">Telegram Assistant Linking</h2>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">
                Connect your account with <strong>@AblewayBot</strong> on Telegram to receive course announcements and verified accessible job matches on your phone.
              </p>

              {/* Linking Scope Notice */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-700 text-xs text-slate-200 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>Privacy Notice</span>
                </span>
                <p>
                  Linking allows the bot to send you your job updates. The bot <strong>CANNOT</strong> access or read your other private Telegram chats.
                </p>
              </div>

              {/* Active Link Status or Code Generator */}
              {isLinked ? (
                <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                    <span>Telegram Connected (@LearnerAccount)</span>
                  </div>
                  <p className="text-xs text-slate-200">
                    Your Telegram account is connected. Job alerts are being delivered to your app.
                  </p>
                  <button
                    type="button"
                    onClick={handleUnlink}
                    className="w-full py-2.5 px-3 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold rounded-xl min-h-[44px] flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>Unlink Telegram Account</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!oneTimeCode ? (
                    <button
                      type="button"
                      onClick={handleGenerateLinkCode}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm min-h-[48px] flex items-center justify-center gap-2 shadow-md"
                    >
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                      <span>Generate One-Time Linking Code</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-950 border border-emerald-500 rounded-2xl space-y-3 text-center">
                      <span className="text-xs font-mono text-emerald-400 uppercase font-bold">Your 6-Digit Code:</span>
                      <p className="text-3xl font-mono font-black text-white tracking-widest">{oneTimeCode}</p>
                      <p className="text-xs text-slate-300">
                        Send to <strong>@AblewayBot</strong> on Telegram:
                        <br />
                        <code className="text-emerald-300 font-bold font-mono">/link {oneTimeCode}</code>
                      </p>
                      {/* Rule 18: Extend time limit */}
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleExtendCode}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-lg border border-slate-600 min-h-[44px] flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Extend Time (+5 mins)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSimulateBotLinked}
                          className="text-xs bg-emerald-800 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg min-h-[44px]"
                        >
                          [Demo] Verified
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Rule 9 & Rule 24: Keyboard Shortcuts Reference (Accessible Data Table) */}
          <section id="help-shortcuts" aria-labelledby="shortcuts-heading" className="p-6 bg-slate-900 border border-slate-700 rounded-3xl space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <h2 id="shortcuts-heading" className="text-lg font-bold text-white">Keyboard Shortcuts & Help</h2>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Use these modifier key combinations across all pages for fast access:
            </p>

            {/* Semantic Data Table (Rule 24) */}
            <table className="w-full text-xs text-left border-collapse border border-slate-700">
              <caption className="sr-only">List of global keyboard shortcuts and their actions</caption>
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="p-2 border border-slate-700 font-bold">Shortcut</th>
                  <th scope="col" className="p-2 border border-slate-700 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                <tr>
                  <th scope="row" className="p-2 border border-slate-700 font-mono text-emerald-300">Alt + Shift + V</th>
                  <td className="p-2 border border-slate-700">Start / Stop Voice Input</td>
                </tr>
                <tr>
                  <th scope="row" className="p-2 border border-slate-700 font-mono text-emerald-300">Alt + Shift + A</th>
                  <td className="p-2 border border-slate-700">Open / Close Web Assistant</td>
                </tr>
                <tr>
                  <th scope="row" className="p-2 border border-slate-700 font-mono text-emerald-300">Alt + Shift + T</th>
                  <td className="p-2 border border-slate-700">Call Human Helper</td>
                </tr>
                <tr>
                  <th scope="row" className="p-2 border border-slate-700 font-mono text-emerald-300">Escape</th>
                  <td className="p-2 border border-slate-700">Close active dialog and return focus</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
