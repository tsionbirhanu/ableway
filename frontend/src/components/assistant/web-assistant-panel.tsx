'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Mic, MicOff, Send, PhoneCall, Volume2, VolumeX, X, HelpCircle, MessageSquare, Globe } from 'lucide-react';
import { useA11y } from '@/core/a11y/a11y-context';
import { playEarcon } from '@/core/audio/earcons';
import { getTranslation } from '@/core/i18n/translations';
import { AllowedAction } from '@/types';

interface Message {
  sender: 'learner' | 'assistant' | 'helper' | 'system';
  text: string;
}

export function WebAssistantPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, speechRate, setSpeechRate, announce, language, toggleLanguage } = useA11y();

  const isAmharic = language === 'am-ET';
  const t = getTranslation(language);

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: t.assistant.welcome,
    },
  ]);
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef<unknown>(null);

  // Update initial message on language change
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].sender === 'assistant') {
        return [{ sender: 'assistant', text: t.assistant.welcome }];
      }
      return prev;
    });
  }, [language, t.assistant.welcome]);

  // Announce page arrival on route change (FR-1.3)
  useEffect(() => {
    const pageDescriptions = t.assistant.pageArrival;
    const desc = pageDescriptions[pathname] || (isAmharic ? `${pathname} ገጽ ላይ ይገኛሉ።` : `You are on ${pathname}.`);
    announce(desc);
    if (mode === 'voice-first' && !isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(desc);
      utter.rate = speechRate;
      utter.lang = isAmharic ? 'am-ET' : 'en-US';
      window.speechSynthesis.speak(utter);
    }
  }, [pathname, mode, speechRate, isMuted, announce, isAmharic, t.assistant.pageArrival]);

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
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      announce('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      (recognitionRef.current as any)?.stop();
      setIsListening(false);
      playEarcon('stop');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = isAmharic ? 'am-ET' : 'en-US';
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      playEarcon('listening');
      announce(t.assistant.listening);
    };

    recognition.onresult = (event: { results: Array<Array<{ transcript: string }>> }) => {
      const transcript = event.results[0][0].transcript;
      playEarcon('success');
      handleSendMessage(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      playEarcon('error');
      announce(
        isAmharic
          ? 'ድምጽዎን በግልጽ መስማት አልቻልኩም። እባክዎ እንደገና ይናገሩ ወይም ይተይቡ።'
          : 'I could not hear you clearly. Please try speaking again or type your message.'
      );
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
    // Slower, calmer speech rate
    utterance.rate = Math.min(speechRate, 0.82);
    utterance.lang = isAmharic ? 'am-ET' : 'en-US';
    utterance.onend = () => {
      // Automatically resume hands-free listening after speaking
      try {
        if (!isListening && recognitionRef.current) {
          (recognitionRef.current as any).start();
        }
      } catch {}
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Check built-in voice commands (FR-1.4) (English & Amharic)
    const lower = text.toLowerCase().trim();
    if (lower === 'stop' || lower === 'አቁም' || lower === 'ዝም በል') {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
      announce(isAmharic ? 'ድምጽ ቆሟል።' : 'Speech stopped.');
      return;
    }
    if (lower === 'slower' || lower === 'ቀንስ' || lower === 'አዝግም') {
      const newRate = Math.max(0.75, speechRate - 0.25);
      setSpeechRate(newRate);
      const msg = isAmharic ? `የንግግር ፍጥነት ወደ ${newRate} ተቀይሯል።` : `Speech rate set to ${newRate}x`;
      announce(msg);
      speakText(isAmharic ? 'በዝግታ እየተናገርኩ ነው።' : 'Speaking slower now.');
      return;
    }
    if (lower === 'faster' || lower === 'ጨምር' || lower === 'አፍጥን') {
      const newRate = Math.min(2.0, speechRate + 0.25);
      setSpeechRate(newRate);
      const msg = isAmharic ? `የንግግር ፍጥነት ወደ ${newRate} ተቀይሯል።` : `Speech rate set to ${newRate}x`;
      announce(msg);
      speakText(isAmharic ? 'በፍጥነት እየተናገርኩ ነው።' : 'Speaking faster now.');
      return;
    }
    if (lower === 'where am i' || lower === 'የት ነኝ' || lower === 'የት ገጽ ነኝ') {
      const loc = isAmharic ? `አሁን ${pathname} ገጽ ላይ ይገኛሉ።` : `You are on the ${pathname} page.`;
      announce(loc);
      speakText(loc);
      return;
    }
    if (lower === 'call human' || lower === 'human help' || lower === 'ሰው ጥራልኝ' || lower === 'የሰው እርዳታ' || lower === 'ሰው አገናኘኝ') {
      const msg = isAmharic ? 'ከቀጥታ የሰው አጋዥ ጋር በማገናኘት ላይ...' : 'Connecting you to a live human helper...';
      announce(msg);
      speakText(msg);
      router.push('/payment#human-help');
      return;
    }
    if (lower === 'courses' || lower === 'ኮርሶች' || lower === 'ኮርስ') {
      const msg = isAmharic ? 'ወደ ኮርስ መምረጫ ገጽ እየወሰድኩዎ ነው።' : 'Going to course choice.';
      announce(msg);
      speakText(msg);
      router.push('/courses');
      return;
    }
    if (lower === 'register' || lower === 'ተመዝገብ' || lower === 'ምዝገባ') {
      const msg = isAmharic ? 'ወደ ምዝገባ ገጽ እየወሰድኩዎ ነው።' : 'Going to registration.';
      announce(msg);
      speakText(msg);
      router.push('/register');
      return;
    }
    if (lower === 'home' || lower === 'መነሻ') {
      const msg = isAmharic ? 'ወደ መነሻ ገጽ እየወሰድኩዎ ነው።' : 'Going home.';
      announce(msg);
      speakText(msg);
      router.push('/');
      return;
    }
    if (lower === 'help' || lower === 'እገዛ' || lower === 'እርዳታ') {
      const msg = isAmharic
        ? 'የሚከተሉትን ማለት ይችላሉ፦ «ኮርሶች»፣ «ተመዝገብ»፣ «ሰው ጥራልኝ»፣ «የት ነኝ» ወይም «አቁም»።'
        : 'You can say "courses", "register", "call human", "where am i", or "stop".';
      announce(msg);
      speakText(msg);
      return;
    }

    const newMsgs: Message[] = [...messages, { sender: 'learner', text }];
    setMessages(newMsgs);
    setInputText('');

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, currentPage: pathname, language }),
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
    } catch (_err) {
      const fallback = isAmharic
        ? 'ጥያቄዎ በስርዓቱ እየተስተናገደ ነው። «እገዛ» ወይም «ሰው ጥራልኝ» ማለት ይችላሉ።'
        : 'I am currently processing your request locally. You can say "help" or request human assistance.';
      setMessages((prev) => [...prev, { sender: 'assistant', text: fallback }]);
      announce(fallback);
      speakText(fallback);
    }
  };

  const executeActions = (actions: AllowedAction[]) => {
    for (const action of actions) {
      if (action.name === 'go_to_page' && action.params.path) {
        router.push(String(action.params.path));
      } else if (action.name === 'fill_field') {
        const fieldName = String(action.params.field || '');
        const fieldValue = action.params.value as string | boolean;
        if (typeof window !== 'undefined' && window.fillField) {
          window.fillField(fieldName as any, fieldValue);
        } else {
          const inputElem = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
          if (inputElem) {
            if (inputElem.type === 'checkbox') {
              inputElem.checked = Boolean(fieldValue);
            } else {
              inputElem.value = String(fieldValue);
            }
            inputElem.dispatchEvent(new Event('input', { bubbles: true }));
            inputElem.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        announce(`Entered ${String(fieldValue)} into ${fieldName}`);
      } else if (action.name === 'request_human') {
        router.push('/payment#human-help');
      }
    }
  };

  return (
    <>
      {/* Persistent Floating Trigger Widget Matching Screenshot (FR-1.1) with Orange Accents */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="bg-[#0B132B]/95 hover:bg-slate-900 text-slate-100 border border-orange-500/40 px-3.5 py-2 rounded-full flex items-center gap-2 text-xs font-semibold shadow-2xl backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer"
          aria-expanded={isOpen}
        >
          <span className="text-orange-400 font-bold" aria-hidden="true">⍟</span>
          <span>Voice & A11y</span>
        </button>

        <button
          type="button"
          onClick={toggleListening}
          className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all focus:outline-none focus:ring-4 focus:ring-orange-400 cursor-pointer ${
            isListening
              ? 'bg-rose-600 animate-pulse'
              : 'bg-orange-600 hover:bg-orange-500 shadow-orange-950/40'
          }`}
          aria-label={isListening ? 'Stop microphone' : 'Activate microphone'}
          aria-pressed={isListening}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>

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
              <h2 className="font-bold text-base text-white">
                {isAmharic ? 'የኤብልዌይ ድምጽ ረዳት' : 'Ableway Web Assistant'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLanguage}
                className="px-2.5 py-1 text-xs font-bold text-orange-400 bg-slate-900 border border-orange-500/60 rounded-md hover:bg-slate-700 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                aria-label={isAmharic ? 'ወደ እንግሊዝኛ ቀይር' : 'Switch to Amharic'}
                title={isAmharic ? 'ወደ እንግሊዝኛ ቀይር' : 'Switch to Amharic'}
              >
                <Globe className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                <span>{isAmharic ? 'አማ (AM)' : 'EN (US)'}</span>
              </button>
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
                  {msg.sender === 'learner'
                    ? isAmharic ? 'እርስዎ' : 'You'
                    : msg.sender === 'helper'
                    ? isAmharic ? 'የሰው አጋዥ' : 'Human Helper'
                    : isAmharic ? 'ረዳት' : 'Assistant'}
                </div>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions Bar */}
          <div className="px-4 py-2 bg-slate-800/60 border-t border-slate-700 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => handleSendMessage(isAmharic ? 'እገዛ' : 'Help')}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200"
            >
              {isAmharic ? 'የእገዛ አማራጮች' : 'Help Options'}
            </button>
            <button
              onClick={() => handleSendMessage(isAmharic ? 'የት ነኝ' : 'Where am I')}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200"
            >
              {isAmharic ? 'የት ነኝ?' : 'Where am I?'}
            </button>
            <button
              onClick={() => handleSendMessage(isAmharic ? 'ሰው ጥራልኝ' : 'Call human')}
              className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 rounded-md text-white font-medium flex items-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{isAmharic ? 'ሰው ጥራልኝ' : 'Call Human'}</span>
            </button>
            <button
              onClick={() => handleSendMessage(isAmharic ? 'ኮርሶች' : 'Courses')}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200"
            >
              {isAmharic ? 'ኮርሶች' : 'Courses'}
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

