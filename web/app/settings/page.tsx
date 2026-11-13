'use client';

import React from 'react';
import { Settings, Save, CheckCircle2 } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';

export default function SettingsPage() {
  const {
    mode,
    setMode,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    speechRate,
    setSpeechRate,
    language,
    setLanguage,
    reducedMotion,
    setReducedMotion,
    selectedVoice,
    setSelectedVoice,
    availableVoices,
    announce,
  } = useA11y();

  const [savedNotice, setSavedNotice] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    announce('All accessibility settings have been saved to your profile and cookies.', 'polite');
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <h1 id="settings-h1" className="text-3xl font-extrabold text-white">
          Platform Accessibility Settings
        </h1>
        <p className="text-slate-200 text-sm leading-relaxed">
          Configure your screen reader preferences, voice assistant rates, color contrast themes, and typography scaling. All preferences are saved to your profile and applied before initial page paint with zero flash.
        </p>
      </header>

      {savedNotice && (
        <div role="status" className="p-4 bg-emerald-950 border border-emerald-700 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>Settings saved and applied across all pages.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8 bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-3xl shadow-xl">
        {/* Interaction Mode */}
        <fieldset className="space-y-3 border-0 p-0 m-0">
          <legend className="text-base font-bold text-white">
            1. Assistant Interaction Mode
          </legend>
          <p className="text-xs text-slate-300">
            Choose whether the web assistant speaks aloud or operates strictly through ARIA live regions for screen reader software.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'voice-first', title: 'Voice Mode', desc: 'The app speaks assistant replies and guidance aloud.' },
              { id: 'screen-reader', title: 'Screen Reader Mode', desc: 'The app never speaks aloud. Everything routes silently to ARIA live regions.' },
              { id: 'hybrid', title: 'Hybrid Mode', desc: 'Audio cues and speech synthesis with live regions enabled.' },
            ].map((m) => (
              <label
                key={m.id}
                htmlFor={`mode-${m.id}`}
                className={`p-4 rounded-2xl border text-sm flex flex-col justify-between min-h-[44px] cursor-pointer transition-colors ${
                  mode === m.id
                    ? 'bg-emerald-950 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-600'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      id={`mode-${m.id}`}
                      type="radio"
                      name="interaction-mode"
                      value={m.id}
                      checked={mode === m.id}
                      onChange={() => {
                        setMode(m.id as any);
                        announce(`Switched to ${m.title}`);
                      }}
                      className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-700"
                    />
                    <span className="font-bold text-white">{m.title}</span>
                  </div>
                  <p className="text-xs text-slate-300 pl-6 leading-relaxed">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Contrast Theme */}
        <div className="space-y-2">
          <label htmlFor="settings-theme-select" className="block text-sm font-bold text-white">
            2. Color Contrast Theme (WCAG AAA)
          </label>
          <p className="text-xs text-slate-300">
            High contrast exceeds a 7:1 ratio. Yellow on black provides maximum luminance separation.
          </p>
          <select
            id="settings-theme-select"
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value as any);
              announce(`Theme set to ${e.target.value}`);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="default">Default Savanna Dark (4.5:1)</option>
            <option value="high-contrast">High Contrast White on Black (7:1+)</option>
            <option value="dark-contrast">Pure Black (OLED)</option>
            <option value="yellow-black">Yellow on Black</option>
          </select>
        </div>

        {/* Text Sizing */}
        <div className="space-y-2">
          <label htmlFor="settings-font-select" className="block text-sm font-bold text-white">
            3. Text Scaling
          </label>
          <p className="text-xs text-slate-300">
            Scales base font up to 180%–200% with responsive two-dimensional reflow.
          </p>
          <select
            id="settings-font-select"
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value as any);
              announce(`Font size set to ${e.target.value}`);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="normal">Normal (100% / 18px base)</option>
            <option value="large">Large (125% / 22px base)</option>
            <option value="x-large">Extra Large (150% / 27px base)</option>
            <option value="xx-large">Maximum (180% / 32px base)</option>
          </select>
        </div>

        {/* Speech Rate */}
        <div className="space-y-2">
          <label htmlFor="settings-speech-rate" className="block text-sm font-bold text-white">
            4. Speech Rate ({speechRate}x)
          </label>
          <div className="flex items-center gap-4">
            <input
              id="settings-speech-rate"
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-500 min-h-[44px]"
            />
            <span className="font-mono text-sm font-bold text-emerald-400 w-16 text-right">{speechRate}x</span>
          </div>
        </div>

        {/* Speech Voice */}
        {availableVoices.length > 0 && (
          <div className="space-y-2">
            <label htmlFor="settings-voice-select" className="block text-sm font-bold text-white">
              5. Voice Synthesizer
            </label>
            <select
              id="settings-voice-select"
              value={selectedVoice || ''}
              onChange={(e) => setSelectedVoice(e.target.value || null)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Default System Voice</option>
              {availableVoices.map((v: SpeechSynthesisVoice) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Language */}
        <div className="space-y-2">
          <label htmlFor="settings-language-select" className="block text-sm font-bold text-white">
            6. Preferred Language
          </label>
          <select
            id="settings-language-select"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              announce(`Language set to ${e.target.value}`);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="en">English</option>
            <option value="am">Amharic (አማርኛ)</option>
            <option value="om">Afaan Oromoo</option>
          </select>
        </div>

        {/* Reduced Motion */}
        <div className="pt-2">
          <label htmlFor="settings-reduced-motion" className="flex items-center gap-3 cursor-pointer min-h-[44px]">
            <input
              id="settings-reduced-motion"
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => {
                setReducedMotion(e.target.checked);
                announce(e.target.checked ? 'Reduced motion enabled.' : 'Reduced motion disabled.');
              }}
              className="w-5 h-5 rounded text-emerald-600 bg-slate-950 border-slate-700"
            />
            <span className="text-sm text-slate-100 font-bold">
              7. Enable Reduced Motion (Disable transitions and animations)
            </span>
          </label>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl min-h-[48px] flex items-center justify-center gap-2 text-base shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-300"
          >
            <Save className="w-5 h-5" aria-hidden="true" />
            <span>Save & Apply Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}

