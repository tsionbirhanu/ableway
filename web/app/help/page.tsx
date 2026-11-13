'use client';

import React from 'react';
import { HelpCircle, PhoneCall, Mic, Keyboard, Volume2 } from 'lucide-react';

export default function HelpPage() {
  const keyboardShortcuts = [
    { key: 'Alt + Shift + V', action: 'Start or stop voice input' },
    { key: 'Alt + Shift + A', action: 'Open or close the Web Assistant panel' },
    { key: 'Alt + Shift + S', action: 'Open the Quick Accessibility Settings dialog' },
    { key: 'Alt + Shift + H', action: 'Open this Help page from any screen' },
    { key: 'Alt + Shift + T', action: 'Call a human helper immediately' },
    { key: 'Escape', action: 'Close any open dialog and return focus to its trigger button' },
    { key: 'Tab / Shift + Tab', action: 'Move forward or backward through interactive controls' },
    { key: 'Spacebar / Enter', action: 'Activate the focused button or link' },
  ];

  const voiceCommands = [
    { command: 'Help', description: 'Hear the list of things you can do on the current page' },
    { command: 'Repeat', description: 'Hear the last assistant message or instructions spoken again' },
    { command: 'Slower', description: 'Slow down the voice speaking rate' },
    { command: 'Faster', description: 'Speed up the voice speaking rate' },
    { command: 'Go back', description: 'Navigate backward to the previous page' },
    { command: 'Where am I', description: 'Hear the current page title, location, and available actions' },
    { command: 'Stop', description: 'Immediately cancel speech output' },
    { command: 'Call a person / Call human', description: 'Connect directly with a human staff helper' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Page Header (Rule 2: Exactly one h1) */}
      <header className="space-y-2">
        <h1 id="help-h1" className="text-3xl font-extrabold text-white">
          Help and Accessibility Guide
        </h1>
        <p className="text-slate-200 text-sm leading-relaxed">
          You can control the Ableway platform entirely by keyboard shortcuts, spoken voice commands, or touch. Human helpers are always available to assist you.
        </p>
      </header>

      {/* Prominent "Call a Person" Button */}
      <section aria-labelledby="live-help-heading" className="p-6 bg-slate-900 border-2 border-emerald-500 rounded-3xl space-y-3 shadow-xl">
        <h2 id="live-help-heading" className="text-xl font-bold text-white flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <span>Need Live Human Assistance?</span>
        </h2>
        <p className="text-slate-200 text-sm leading-relaxed">
          If you need help at any time, a human staff member can assist you by phone, SMS, Telegram, or in-page chat.
        </p>
        <div className="pt-2">
          <a
            href="/payment#human-help"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl min-h-[48px] text-sm shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-300"
          >
            <PhoneCall className="w-4 h-4" aria-hidden="true" />
            <span>Call a Person (Human Helper)</span>
          </a>
        </div>
      </section>

      {/* Keyboard Shortcuts Section (Semantic Table - Rule 24) */}
      <section aria-labelledby="shortcuts-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <h2 id="shortcuts-heading" className="text-2xl font-bold text-white">
            Keyboard Shortcuts
          </h2>
        </div>
        <p className="text-xs text-slate-300">
          All shortcuts use modifier combinations (Alt + Shift) to prevent conflicts with your screen reader.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse border border-slate-700 bg-slate-900 rounded-2xl overflow-hidden">
            <caption className="sr-only">Global keyboard shortcuts for navigating Ableway</caption>
            <thead>
              <tr className="bg-slate-800 text-white">
                <th scope="col" className="p-3.5 border border-slate-700 font-bold">Shortcut Key</th>
                <th scope="col" className="p-3.5 border border-slate-700 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-100">
              {keyboardShortcuts.map((item) => (
                <tr key={item.key} className="hover:bg-slate-850">
                  <th scope="row" className="p-3.5 border border-slate-700 font-mono text-emerald-300 font-bold text-xs">
                    {item.key}
                  </th>
                  <td className="p-3.5 border border-slate-700">
                    {item.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Voice Commands Section (Semantic Table - Rule 24) */}
      <section aria-labelledby="voice-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <h2 id="voice-heading" className="text-2xl font-bold text-white">
            Spoken Voice Commands
          </h2>
        </div>
        <p className="text-xs text-slate-300">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-xs text-white">Alt + Shift + V</kbd> to start speaking, or say these plain commands:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse border border-slate-700 bg-slate-900 rounded-2xl overflow-hidden">
            <caption className="sr-only">Voice commands recognized by the Ableway Web Assistant</caption>
            <thead>
              <tr className="bg-slate-800 text-white">
                <th scope="col" className="p-3.5 border border-slate-700 font-bold">Voice Command</th>
                <th scope="col" className="p-3.5 border border-slate-700 font-bold">What It Does</th>
              </tr>
            </thead>
            <tbody className="text-slate-100">
              {voiceCommands.map((cmd) => (
                <tr key={cmd.command} className="hover:bg-slate-850">
                  <th scope="row" className="p-3.5 border border-slate-700 font-mono text-emerald-300 font-bold text-xs">
                    &quot;{cmd.command}&quot;
                  </th>
                  <td className="p-3.5 border border-slate-700">
                    {cmd.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

