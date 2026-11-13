'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Mic, MicOff, Send, PhoneCall, Volume2, VolumeX, X, HelpCircle, MessageSquare } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { playEarcon } from '@/lib/audio/earcons';
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
      text: 'Hello! I am your Ableway Assistant. Press Alt+V to speak or type your question. Say "Help" for options or "Call human" for live support.',
    },
  ]);
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Announce page arrival on route change (FR-1.3)
  useEffect(() => {
    const pageDescriptions: Record<string, string> = {
      '/': 'You are on the Ableway Home and Savanna Hub. You can register, choose a course, or open Savanna.',
      '/register': 'You are on the Registration page. I can fill the form as you speak your details.',
      '/courses': 'You are on the Course Choice page. Ask me to describe or compare courses.',
      '/payment': 'You are on the Payment page. We use human-assisted payments with staff guidance.',
      '/learn': 'You are on the Learning Platform. You can explore course modules, audio lessons, and quizzes.',
      '/profile': 'You are on your Profile page. You can manage settings or link your Telegram account.',
      '/staff/help-queue': 'Staff Console: Accessible Human Helper Queue.',
      '/savanna': 'Savanna Learning Portal view.',
    };

    const desc = pageDescriptions[pathname] || `You are on ${pathname}.`;
    announce(desc);
    if (mode === 'voice-first' && !isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(desc);
      utter.rate = speechRate;
      window.speechSynthesis.speak(utter);
    }
  }, [pathname, mode, speechRate, isMuted, announce]);

  // Global hotkeys (Alt+A or Alt+V to toggle assistant/mic)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setIsOpen(true);
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      announce('Listening for your command or answers.');
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

    // Check built-in voice commands (FR-1.4)
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

      // Execute returned allowed actions (FR-1.5)
      if (data.actions && data.actions.length > 0) {
        executeActions(data.actions);
      }
    } catch (err) {
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
      {/* Persistent Floating Trigger Button (FR-1.1) */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-3 rounded-full shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-300 transition-transform active:scale-95"
        aria-label="Ableway Web Assistant (Press Alt+A)"
        aria-expanded={isOpen}
      >
        <MessageSquare className="w-5 h-5" aria-hidden="true" />
        <span className="hidden sm:inline">Ableway Assistant</span>
      </button>

      {/* Accessible Assistant Slide-over / Modal Panel */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label="Ableway Assistant Spoken Panel"
          className="fixed bottom-20 right-4 sm:right-6 w-[94vw] sm:w-[420px] max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-slate-100"
        >
          {/* Header */}
          <header className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              <h2 className="font-bold text-base text-white">Ableway Web Assistant</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted((m) => !m)}
                className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                aria-label="Close Assistant Panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]" aria-live="polite">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl text-sm ${
                  msg.sender === 'learner'
                    ? 'bg-emerald-700 text-white ml-8'
                    : msg.sender === 'helper'
                    ? 'bg-blue-800 text-white mr-8 border border-blue-400'
                    : 'bg-slate-800 text-slate-200 mr-8'
                }`}
              >
                <div className="font-semibold text-xs mb-1 opacity-75 uppercase tracking-wide">
                  {msg.sender === 'learner' ? 'You' : msg.sender === 'helper' ? 'Human Helper' : 'Assistant'}
                </div>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions Bar */}
          <div className="px-4 py-2 bg-slate-800/60 border-t border-slate-700 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => handleSendMessage('Help')}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200"
            >
              Help Options
            </button>
            <button
              onClick={() => handleSendMessage('Where am I')}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200"
            >
              Where am I?
            </button>
            <button
              onClick={() => handleSendMessage('Call human')}
              className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 rounded-md text-white font-medium flex items-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Call Human
            </button>
          </div>

          {/* Input & Voice Controls */}
          <footer className="p-3 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`p-3 rounded-xl font-bold flex items-center justify-center transition-colors ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start speaking (Alt+V)'}
              aria-pressed={isListening}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="flex-1 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask assistant or answer form..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Assistant message input"
              />
              <button
                type="submit"
                className="p-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </footer>
        </aside>
      )}
    </>
  );
}

