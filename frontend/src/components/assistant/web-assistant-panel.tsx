'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Mic, MicOff, Send, PhoneCall, Volume2, VolumeX, X, MessageSquare } from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';
import { playEarcon } from '@/core/audio/earcons';
import { AllowedAction } from '@/types';

interface Message {
  sender: 'learner' | 'assistant' | 'helper' | 'system';
  text: string;
}

export function WebAssistantPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, speechRate, setSpeechRate, announce } = useA11y();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Hello! I am your Ableway Assistant. Press Alt+Shift+V to speak or type your question. Say "Help" for options or "Call human" for live support.',
    },
  ]);
  const [isMuted, setIsMuted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Rule 9: Modifier shortcuts (Alt+Shift+A to toggle dialog, Alt+Shift+V to toggle speech)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.altKey && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setIsOpen(true);
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Rule 8: Dialog focus management & Escape handler
  useEffect(() => {
    if (isOpen) {
      // Focus first input inside dialog
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      };

      // Focus trap inside dialog
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !dialogRef.current) return;
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

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
      // Return focus to trigger when closing
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Web Speech API STT setup
  const toggleListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      announce('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      playEarcon('stop');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      playEarcon('listening');
      announce('Listening for your command or answer.');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      playEarcon('success');
      handleSendMessage(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      playEarcon('error');
      announce('I could not hear you clearly. Please try speaking again or type your message.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Rule 20: Dual Modes. Never speak in screen reader mode!
  const speakText = (text: string) => {
    if (mode === 'screen-reader' || isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const lower = text.toLowerCase().trim();
    if (lower === 'stop') {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
      announce('Speech stopped.');
      return;
    }
    if (lower === 'slower') {
      const newRate = Math.max(0.75, speechRate - 0.25);
      setSpeechRate(newRate);
      announce(`Speech rate set to ${newRate}x`);
      speakText(`Speaking slower now.`);
      return;
    }
    if (lower === 'faster') {
      const newRate = Math.min(2.0, speechRate + 0.25);
      setSpeechRate(newRate);
      announce(`Speech rate set to ${newRate}x`);
      speakText(`Speaking faster now.`);
      return;
    }
    if (lower === 'where am i') {
      const loc = `You are on the ${pathname} page.`;
      announce(loc);
      speakText(loc);
      return;
    }

    const newMsgs: Message[] = [...messages, { sender: 'learner', text }];
    setMessages(newMsgs);
    setInputText('');

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, currentPage: pathname }),
      });

      if (!res.ok) throw new Error('Assistant API error');
      const data = await res.json();

      setMessages((prev) => [...prev, { sender: 'assistant', text: data.reply }]);
      announce(data.reply);
      speakText(data.spokenReply || data.reply);

      if (data.actions && data.actions.length > 0) {
        executeActions(data.actions);
      }
    } catch (_err) {
      const fallback = 'I am currently processing your request locally. You can say "help" or request human assistance.';
      setMessages((prev) => [...prev, { sender: 'assistant', text: fallback }]);
      announce(fallback);
      speakText(fallback);
    }
  };

  const executeActions = (actions: AllowedAction[]) => {
    for (const action of actions) {
      if (action.name === 'go_to_page' && action.params.path) {
        router.push(action.params.path);
      } else if (action.name === 'fill_field') {
        const inputElem = document.querySelector(`[name="${action.params.field}"]`) as HTMLInputElement;
        if (inputElem) {
          inputElem.value = action.params.value;
          inputElem.dispatchEvent(new Event('input', { bubbles: true }));
          announce(`Entered ${action.params.value} into ${action.params.field}`);
        }
      } else if (action.name === 'request_human') {
        router.push('/payment#human-help');
      }
    }
  };

  return (
    <>
      {/* Rule 12: Target size 44x44px. Rule 1: native button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 min-h-[48px] min-w-[48px] rounded-full shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-300 transition-transform"
        aria-label="Ableway Assistant. Press Alt+Shift+A to open, or Alt+Shift+V to speak."
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <MessageSquare className="w-5 h-5" aria-hidden="true" />
        <span className="hidden sm:inline">Ableway Assistant</span>
      </button>

      {/* Rule 8: Native-accessible Dialog */}
      {isOpen && (
        <aside
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-panel-title"
          className="fixed bottom-20 right-4 sm:right-6 w-[94vw] sm:w-[420px] max-h-[80vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden text-slate-100"
        >
          {/* Header */}
          <header className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400" aria-hidden="true" />
              <h2 id="assistant-panel-title" className="font-bold text-base text-white">Ableway Assistant</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="p-2 text-slate-200 hover:text-white rounded-lg hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={isMuted ? 'Unmute speech output' : 'Mute speech output'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" aria-hidden="true" /> : <Volume2 className="w-5 h-5" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-200 hover:text-white rounded-lg hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close Assistant Panel (Press Escape)"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]" aria-live="polite">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl text-sm ${
                  msg.sender === 'learner'
                    ? 'bg-emerald-700 text-white ml-6'
                    : msg.sender === 'helper'
                    ? 'bg-blue-800 text-white mr-6 border border-blue-400'
                    : 'bg-slate-800 text-slate-100 mr-6'
                }`}
              >
                <div className="font-semibold text-xs mb-1 opacity-80 uppercase tracking-wide">
                  {msg.sender === 'learner' ? 'You' : msg.sender === 'helper' ? 'Human Helper' : 'Assistant'}
                </div>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions Bar (At most 5 options - Rule 23) */}
          <nav aria-label="Assistant quick commands" className="px-4 py-2 bg-slate-800/80 border-t border-slate-700 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSendMessage('Help')}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-100 min-h-[44px] flex items-center"
            >
              1. Help
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Where am I')}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-100 min-h-[44px] flex items-center"
            >
              2. Where am I?
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Call human')}
              className="px-3 py-2 bg-amber-800 hover:bg-amber-700 rounded-lg text-white font-bold flex items-center gap-1.5 min-h-[44px]"
            >
              <PhoneCall className="w-4 h-4" aria-hidden="true" />
              <span>3. Call Human</span>
            </button>
          </nav>

          {/* Input & Voice Controls */}
          <footer className="p-3 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-xl font-bold flex items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${
                isListening
                  ? 'bg-red-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start speaking (Press Alt+Shift+V)'}
              aria-pressed={isListening}
            >
              {isListening ? <MicOff className="w-5 h-5" aria-hidden="true" /> : <Mic className="w-5 h-5" aria-hidden="true" />}
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex-1 flex items-center gap-2"
            >
              <label htmlFor="assistant-input-field" className="sr-only">Type a message to the assistant</label>
              <input
                ref={firstInputRef}
                id="assistant-input-field"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask assistant or answer form..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Send message to assistant"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </footer>
        </aside>
      )}
    </>
  );
}
