'use client';

import React, { useEffect, useRef } from 'react';
import { X, Settings, Volume2, Moon, Sun, Eye, Sliders, Type, FastForward } from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';

interface QuickSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function QuickSettingsDialog({ isOpen, onClose, triggerRef }: QuickSettingsDialogProps) {
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

  const dialogRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLButtonElement | null>(null);

  // Focus trap & Escape key
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 50);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          triggerRef?.current?.focus();
        }
      };

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };

      window.addEventListener('keydown', handleEscape);
      dialogRef.current?.addEventListener('keydown', handleTab);

      return () => {
        window.removeEventListener('keydown', handleEscape);
        dialogRef.current?.removeEventListener('keydown', handleTab);
      };
    } else {
      triggerRef?.current?.focus();
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="presentation"
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-settings-heading"
        className="w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 id="quick-settings-heading" className="text-xl font-bold text-white">
              Accessibility Quick Settings
            </h2>
          </div>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-800"
            aria-label="Close Settings Dialog (Escape)"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 text-sm">
          {/* Interaction Mode */}
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              1. Assistant Interaction Mode
            </legend>
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
                    announce(`Mode switched to ${m.label}.`);
                  }}
                  className={`p-3 rounded-xl text-xs font-bold border min-h-[44px] transition-colors ${
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
          </fieldset>

          {/* Color Contrast Theme */}
          <div className="space-y-1.5">
            <label htmlFor="qs-theme" className="block text-xs font-bold text-slate-200">
              2. Contrast Theme
            </label>
            <select
              id="qs-theme"
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value as any);
                announce(`Theme set to ${e.target.value}`);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="default">Standard Savanna (4.5:1)</option>
              <option value="high-contrast">High Contrast (7:1+)</option>
              <option value="dark-contrast">Pure Black (OLED)</option>
              <option value="yellow-black">Yellow on Black</option>
            </select>
          </div>

          {/* Text Sizing */}
          <div className="space-y-1.5">
            <label htmlFor="qs-text-size" className="block text-xs font-bold text-slate-200">
              3. Text Scaling
            </label>
            <select
              id="qs-text-size"
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value as any);
                announce(`Text size set to ${e.target.value}`);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="normal">Normal (100%)</option>
              <option value="large">Large (125%)</option>
              <option value="x-large">Extra Large (150%)</option>
              <option value="xx-large">Maximum (180%)</option>
            </select>
          </div>

          {/* Speech Rate Controls */}
          <div className="space-y-1.5">
            <label htmlFor="qs-speech-rate" className="block text-xs font-bold text-slate-200">
              4. Speech Rate: {speechRate}x
            </label>
            <div className="flex items-center gap-3">
              <input
                id="qs-speech-rate"
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-500 min-h-[44px]"
              />
              <span className="font-mono text-xs font-bold text-emerald-400 w-12 text-right">{speechRate}x</span>
            </div>
          </div>

          {/* Speech Voice Selection */}
          {availableVoices.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="qs-voice" className="block text-xs font-bold text-slate-200">
                5. Synthesizer Voice
              </label>
              <select
                id="qs-voice"
                value={selectedVoice || ''}
                onChange={(e) => setSelectedVoice(e.target.value || null)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Default System Voice</option>
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Language Switcher */}
          <div className="space-y-1.5">
            <label htmlFor="qs-language" className="block text-xs font-bold text-slate-200">
              6. Language
            </label>
            <select
              id="qs-language"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                announce(`Language set to ${e.target.value}`);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="en">English</option>
              <option value="am">Amharic (አማርኛ)</option>
              <option value="om">Afaan Oromoo</option>
            </select>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="pt-2">
            <label htmlFor="qs-reduced-motion" className="flex items-center gap-3 cursor-pointer min-h-[44px]">
              <input
                id="qs-reduced-motion"
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => {
                  setReducedMotion(e.target.checked);
                  announce(e.target.checked ? 'Reduced motion enabled.' : 'Reduced motion disabled.');
                }}
                className="w-5 h-5 rounded text-emerald-600 bg-slate-950 border-slate-700"
              />
              <span className="text-xs text-slate-100 font-bold">7. Respect Reduced Motion (Disable Animations)</span>
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl min-h-[48px] flex items-center justify-center text-sm shadow-md"
          >
            Done & Apply Settings
          </button>
        </div>
      </section>
    </div>
  );
}

