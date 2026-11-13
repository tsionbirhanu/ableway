'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  Sparkles,
  ArrowRight,
  Volume2,
  CheckCircle2,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  BarChart2,
  MessageSquare,
  Briefcase,
  Layers,
  Check,
  Globe,
  Tag,
} from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { playEarcon } from '@/lib/audio/earcons';
import { speechPlayer } from '@/lib/speech/client/player';
import { getSpeechRecognitionConstructor } from '@/lib/speech/client/recognition';
import { useAssistant } from '@/lib/assistant/assistant-context';

interface CourseItem {
  id: string;
  slug: string;
  title: string;
  code: string;
  duration: string;
  level: string;
  description: string;
  syllabus: string[];
  audioMinutes: number;
}

const COURSES: CourseItem[] = [
  {
    id: 'data-analytics',
    slug: 'data-analytics',
    title: 'Data Analytics',
    code: 'DA-100',
    duration: '14 Weeks (56 Hours)',
    level: 'Comprehensive',
    description:
      'Learn to transform data into high-value business decisions. Master SQL databases, Python analytics, Tableau dashboards, and accessible data interpretation.',
    syllabus: ['SQL & Relational Databases', 'Python Data Analysis', 'Tableau Dashboards', 'Predictive Modeling'],
    audioMinutes: 180,
  },
  {
    id: 'wr-100',
    slug: 'wr-100',
    title: 'WR 100: Fundamentals of Effective Communication',
    code: 'WR-100',
    duration: '10 Weeks (40 Hours)',
    level: 'Foundational',
    description:
      'Master professional communication: written reports, email etiquette, executive presentation, and inclusive collaboration designed for remote workplace success.',
    syllabus: ['Business Writing', 'Verbal Persuasion', 'Active Listening', 'Conflict Resolution'],
    audioMinutes: 140,
  },
  {
    id: 'va-1',
    slug: 'va-1',
    title: 'VA-1: Virtual Assistant Foundations',
    code: 'VA-101',
    duration: '8 Weeks (32 Hours)',
    level: 'Practical',
    description:
      'Master executive virtual operations: calendar scheduling, inbox triage, document preparation, and customer coordination using accessible cloud tools.',
    syllabus: ['Calendar & Scheduling', 'Email Management', 'Google Workspace', 'Customer Support Operations'],
    audioMinutes: 120,
  },
  {
    id: 'accessibility-mastery',
    slug: 'accessibility-mastery',
    title: 'Digital Accessibility & Assistive Tech Mastery',
    code: 'A11Y-50',
    duration: '4 Weeks (16 Hours)',
    level: 'Specialized',
    description:
      'Master screen readers (NVDA, JAWS, TalkBack), keyboard navigation, document auditing, and accessible digital productivity for independent study and office work.',
    syllabus: ['Screen Reader Hotkeys', 'Accessible Document Creation', 'Web Navigation Mastery', 'Productivity Workflows'],
    audioMinutes: 90,
  },
];

export default function CoursesPage() {
  const router = useRouter();
  const { announce, mode, preferences, language, toggleLanguage } = useA11y();
  const { registerAction, unregisterAction } = useAssistant();
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Assistant State
  const [assistantActive, setAssistantActive] = useState<boolean>(false);
  const [assistantSpokenText, setAssistantSpokenText] = useState<string>('');
  const [voiceInputText, setVoiceInputText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);

  const isSpeakingRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const assistantActiveRef = useRef(assistantActive);
  assistantActiveRef.current = assistantActive;

  const startListeningRef = useRef<() => void>(() => { });

  // Speak assistant message slowly with safety timeout
  const speakAssistant = useCallback(
    (text: string) => {
      isSpeakingRef.current = true;
      setAssistantSpokenText(text);
      announce(text, 'polite');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch { }
      }
      setIsListening(false);

      if (speechSafetyTimerRef.current) {
        clearTimeout(speechSafetyTimerRef.current);
        speechSafetyTimerRef.current = null;
      }

      if (mode === 'voice-first' && !preferences.suppressInAppTTS && typeof window !== 'undefined') {
        // Server speech (Gemini): a real Amharic voice. Falls back to the browser voice by itself.
        speechPlayer.cancel();
        let finished = false;

        const finishSpeaking = () => {
          if (finished) return;
          finished = true;
          if (speechSafetyTimerRef.current) {
            clearTimeout(speechSafetyTimerRef.current);
            speechSafetyTimerRef.current = null;
          }
          isSpeakingRef.current = false;
          activeUtteranceRef.current = null;
          setTimeout(() => {
            if (assistantActiveRef.current) {
              startListeningRef.current();
            }
          }, 350);
        };

        // Safety timer: server speech can take a few seconds to start, so allow for that.
        const words = text.split(/\s+/).length;
        const duration = Math.max(3500, (words / (0.80 * 2.3)) * 1000 + 1500) + 20000;
        speechSafetyTimerRef.current = setTimeout(finishSpeaking, duration);

        void speechPlayer
          .speak(text, { lang: language === 'am-ET' ? 'am-ET' : 'en-US', rate: 0.8 })
          .then(finishSpeaking);
      } else {
        setTimeout(() => {
          isSpeakingRef.current = false;
          if (assistantActiveRef.current) {
            startListeningRef.current();
          }
        }, 1200);
      }
    },
    [announce, mode, preferences.suppressInAppTTS, language]
  );

  // Set page title and move focus to h1 (F0 Rule 4, 7)
  useEffect(() => {
    document.title = 'Choose a course - Ableway';
    announce('Choose a course page loaded. Select a course using your keyboard or start the spoken assistant.', 'polite');
    if (h1Ref.current) {
      h1Ref.current.focus();
    }
  }, [announce]);

  // Select Course Handler
  const handleSelectCourse = useCallback(
    (course: CourseItem) => {
      setSelectedCourseId(course.id);
      playEarcon('success');
      const isAmharic = language === 'am-ET';
      const msg = isAmharic
        ? `«${course.title}» ተመርጧል። የመጀመሪያውን የድምጽ ትምህርት በማዘጋጀት ላይ...`
        : `Selected ${course.title}. Loading your first audio lesson...`;
      announce(msg, 'polite');
      speakAssistant(msg);

      setTimeout(() => {
        router.push(`/learn/${course.slug}/lesson-1`);
      }, 400);
    },
    [announce, language, router, speakAssistant]
  );

  // Register global assistant action for selecting course
  useEffect(() => {
    registerAction({
      name: 'selectCourse',
      description: 'Enroll in a course by title or id',
      requiresConfirmation: true,
      confirmationPrompt: (params) => {
        const title = (params.title as string) || 'Data Analytics';
        return `Are you sure you want to enroll in ${title}? This will register your enrollment and proceed to your learning dashboard.`;
      },
      announcement: (params) => `Enrolling in ${(params.title as string) || 'course'}.`,
      handler: (params) => {
        const courseId = (params.courseId as string) || 'data-analytics';
        const course = COURSES.find((c) => c.id === courseId || c.slug === courseId) || COURSES[0];
        handleSelectCourse(course);
      },
    });

    return () => {
      unregisterAction('selectCourse');
    };
  }, [registerAction, unregisterAction, handleSelectCourse]);

  // Read Course Details aloud
  const handleReadDetails = (course: CourseItem) => {
    const text = `${course.title}. Code: ${course.code}. Duration: ${course.duration}. ${course.description} Skills included: ${course.syllabus.join(', ')}.`;
    announce(text, 'polite');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      void speechPlayer.speak(text, { lang: language === 'am-ET' ? 'am-ET' : 'en-US', rate: 0.8 });
    }
  };

  // Spoken voice command handler
  const handleVoiceCommand = useCallback(
    (rawInput: string) => {
      const input = rawInput.trim();
      if (!input) return;
      const lower = input.toLowerCase();
      const isAmharic = language === 'am-ET';

      // Meta commands
      if (lower === 'repeat' || lower === 'ድገም' || lower === 'ድገመው' || lower === 'እንደገና') {
        const msg = isAmharic
          ? 'አራት የሚገኙ ኮርሶች አሉን፦ 1: ዳታ አናሊቲክስ፣ 2: ተግባቦት፣ 3: ቨርቹዋል አሲስታንት፣ 4: አስስቲቭ ቴክኖሎጂ። የትኛውን መምረጥ ይፈልጋሉ?'
          : 'We have four available courses: Data Analytics, WR 100 Effective Communication, VA-1 Virtual Assistant, and Assistive Tech Mastery. Which one would you like to select?';
        speakAssistant(msg);
        return;
      }

      if (
        lower.includes('compare') ||
        lower.includes('describe') ||
        lower.includes('አወዳድር') ||
        lower.includes('ዝርዝር') ||
        lower.includes('ንገረኝ')
      ) {
        const msg = isAmharic
          ? 'ዳታ አናሊቲክስ የፓይተን እና SQL ዳታ ትንተናን ያስተምራል። ተግባቦት የሥራ ቦታ ግንኙነትን እና አቀራረብን ያሰለጥናል። ቨርቹዋል አሲስታንት የቢሮ ረዳትነት ክህሎት ይሰጣል። አስስቲቭ ቴክኖሎጂ ስክሪን ሪደርን ያስተምራል። የትኛው ከእቅድዎ ጋር ይሄዳል?'
          : 'Data Analytics focuses on Python, SQL, and data jobs. WR 100 focuses on executive writing and verbal communication. VA-1 focuses on remote virtual assistant tasks. Assistive Tech teaches screen readers. Which one fits your goals?';
        speakAssistant(msg);
        return;
      }

      // Course selection by speech (English & Amharic keywords)
      if (
        lower.includes('data') ||
        lower.includes('analytics') ||
        lower.includes('python') ||
        lower.includes('sql') ||
        lower.includes('first') ||
        lower.includes('ዳታ') ||
        lower.includes('አናሊቲክስ') ||
        lower.includes('አንድ') ||
        lower === '1' ||
        lower.includes('የመጀመሪያ')
      ) {
        handleSelectCourse(COURSES[0]);
        return;
      }
      if (
        lower.includes('communication') ||
        lower.includes('writing') ||
        lower.includes('wr') ||
        lower.includes('second') ||
        lower.includes('ተግባቦት') ||
        lower.includes('ኮሚዩኒኬሽን') ||
        lower.includes('ሁለት') ||
        lower === '2' ||
        lower.includes('ሁለተኛ')
      ) {
        handleSelectCourse(COURSES[1]);
        return;
      }
      if (
        lower.includes('virtual assistant') ||
        lower.includes('assistant') ||
        lower.includes('va') ||
        lower.includes('third') ||
        lower.includes('ቨርቹዋል') ||
        lower.includes('ረዳት') ||
        lower.includes('ሶስት') ||
        lower.includes('ሦስት') ||
        lower === '3' ||
        lower.includes('ሦስተኛ')
      ) {
        handleSelectCourse(COURSES[2]);
        return;
      }
      if (
        lower.includes('assistive') ||
        lower.includes('accessibility') ||
        lower.includes('screen reader') ||
        lower.includes('fourth') ||
        lower.includes('አስስቲቭ') ||
        lower.includes('ስክሪን ሪደር') ||
        lower.includes('አራት') ||
        lower === '4' ||
        lower.includes('አራተኛ')
      ) {
        handleSelectCourse(COURSES[3]);
        return;
      }

      const fallback = isAmharic
        ? `«${input}» ተሰምቷል። «ዳታ አናሊቲክስ»፣ «ተግባቦት»፣ «ቨርቹዋል አሲስታንት» ወይም «አወዳድር» ማለት ይችላሉ።`
        : `I heard ${input}. You can say select Data Analytics, select Communication, select Virtual Assistant, or say compare.`;
      speakAssistant(fallback);
    },
    [handleSelectCourse, language, speakAssistant]
  );

  // Hands-free STT
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isSpeakingRef.current) return;

    const SpeechRec =
      // Server recognition (Gemini): English and Amharic in every browser, browser recognition as fallback.
      getSpeechRecognitionConstructor();

    if (!SpeechRec) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch { }
    }

    try {
      const rec = new SpeechRec();
      rec.lang = language === 'am-ET' ? 'am-ET' : 'en-US';
      rec.interimResults = true;
      rec.continuous = true;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (evt: any) => {
        if (isSpeakingRef.current) return;

        let interim = '';
        let final = '';

        for (let i = evt.resultIndex; i < evt.results.length; ++i) {
          const res = evt.results[i];
          if (res.isFinal) {
            final += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        if (interim.trim()) {
          setVoiceInputText(interim.trim());
        }

        if (final.trim()) {
          const trimmed = final.trim();
          setVoiceInputText(trimmed);
          handleVoiceCommand(trimmed);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          announce('Microphone permission not granted. You can click Select & Proceed on any course card.', 'assertive');
          setIsListening(false);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        if (!isSpeakingRef.current && assistantActiveRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current && assistantActiveRef.current) {
              try {
                rec.start();
              } catch { }
            }
          }, 350);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch { }
  }, [handleVoiceCommand, announce, language]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    (window as any).__simulateVoiceInput = (text: string) => {
      setVoiceInputText(text);
      handleVoiceCommand(text);
    };
  }, [handleVoiceCommand]);

  // Start Assistant on Button Click
  const startAssistant = useCallback(() => {
    isSpeakingRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechPlayer.cancel();
    }
    playEarcon('listening');
    setAssistantActive(true);
    const isAmharic = language === 'am-ET';
    const intro = isAmharic
      ? 'እንኳን ወደ ኮርስ መምረጫ በደህና መጡ። አራት ኮርሶች አሉን፦ አንድ፡ ዳታ አናሊቲክስ፤ ሁለት፡ የሥራ ቦታ ተግባቦት፤ ሦስት፡ ቨርቹዋል አሲስታንት፤ አራት፡ አስስቲቭ ቴክኖሎጂ። የትኛውን መምረጥ ይፈልጋሉ? ስሙን ወይም ቁጥሩን መናገር ይችላሉ።'
      : 'Welcome to course choice. We have four courses: Data Analytics, WR 100 Communication, VA-1 Virtual Assistant, and Assistive Tech Mastery. Say the name of the course you want, or say compare to hear differences.';
    speakAssistant(intro);
  }, [speakAssistant, language]);

  // Manual Toggle
  const toggleListening = () => {
    isSpeakingRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechPlayer.cancel();
    }
    if (isListening) {
      try {
        recognitionRef.current?.abort();
      } catch { }
      setIsListening(false);
      playEarcon('stop');
      announce('Microphone paused.', 'polite');
    } else {
      playEarcon('listening');
      startListening();
      announce('Microphone active. Listening for your course choice.', 'polite');
    }
  };

  const filteredCourses =
    filterLevel === 'all'
      ? COURSES
      : COURSES.filter((c) => (filterLevel === 'comprehensive' ? c.level === 'Comprehensive' : c.level !== 'Comprehensive'));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 bg-white text-slate-900 min-h-screen">
      {/* Page Header (F0 Rule 2, 7: Single h1 with focus) */}
      <header className="space-y-3">
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight focus:outline-none"
        >
          Choose a course
        </h1>
        <p className="text-base text-slate-700 max-w-2xl leading-relaxed">
          Select a programme below to start your audio lessons and practice quizzes. You can navigate by keyboard or use the spoken assistant to choose hands-free.
        </p>
      </header>

      {/* Spoken Course Selection Assistant */}
      <section
        aria-label="Spoken Course Choice Assistant"
        className="bg-slate-50 border-2 border-[#0B132B] rounded-xl p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B132B] border border-orange-500/50 flex items-center justify-center text-orange-400 shrink-0 shadow-sm">
              <Volume2 className="w-5 h-5 text-orange-400" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {language === 'am-ET' ? 'የድምጽ ኮርስ መምረጫ ረዳት' : 'Spoken Course Assistant'}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#0B132B] text-orange-400 border border-orange-500/50">
                  {language === 'am-ET' ? 'በአማርኛ ድምጽ ለመምረጥ ዝግጁ' : 'Voice Selection Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {assistantActive
                  ? language === 'am-ET'
                    ? 'የድምጽ ረዳቱ በአማርኛ እየተናገረ እና የእርስዎን ምርጫ እያዳመጠ ነው።'
                    : 'Speaking slowly and listening automatically for your course choice.'
                  : language === 'am-ET'
                    ? 'የድምጽ ረዳቱን በማስጀመር ኮርሶችን በአማርኛ ድምጽ ይምረጡ።'
                    : 'Start the assistant to hear course recommendations and select by voice.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Language Switch Button */}
            <button
              type="button"
              onClick={() => {
                toggleLanguage();
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.abort();
                  } catch { }
                }
              }}
              id="courses-lang-switch-btn"
              aria-label={`${language === 'am-ET' ? 'ቋንቋ፡ አማርኛ' : 'Language: English'} - Switch language / ቋንቋ ቀይር`}
              className="min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-sm transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
              <span>{language === 'am-ET' ? 'ቋንቋ፡ አማርኛ' : 'Language: English'}</span>
            </button>

            {!assistantActive ? (
              <button
                type="button"
                onClick={startAssistant}
                id="start-courses-assistant-btn"
                className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 cursor-pointer transition-all"
              >
                <Mic className="w-4 h-4 text-white" aria-hidden="true" />
                <span>{language === 'am-ET' ? 'የድምጽ ረዳቱን ጀምር' : 'Start Voice Assistant'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAssistantActive(false);
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.abort();
                    } catch { }
                  }
                  setIsListening(false);
                  const pauseMsg =
                    language === 'am-ET'
                      ? 'የድምጽ ረዳቱ ቆሟል። በኪቦርድዎ ኮርስ መምረጥ ይችላሉ።'
                      : 'Voice assistant paused. You can use your keyboard to select a course.';
                  announce(pauseMsg, 'polite');
                }}
                className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{language === 'am-ET' ? 'ረዳቱን አቁም' : 'Pause Assistant'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Assistant Speech Feedback */}
        {assistantActive && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between min-h-[26px]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B132B] uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" aria-hidden="true" />
                <span>{language === 'am-ET' ? 'ረዳቱ እንዲህ ይላል፦' : 'Assistant says:'}</span>
              </div>
              <div className="h-6 flex items-center">
                {isListening ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-300">
                    <span className="w-2 h-2 rounded-full bg-orange-600" />
                    {language === 'am-ET' ? 'የኮርስ ምርጫዎን በማዳመጥ ላይ...' : 'Listening for course choice...'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    {language === 'am-ET' ? 'በዝግታ እየተናገረ ነው...' : 'Speaking slowly...'}
                  </span>
                )}
              </div>
            </div>

            <p
              data-testid="courses-speech-display"
              className="text-base text-slate-900 font-medium leading-relaxed"
              aria-live="polite"
            >
              {assistantSpokenText ||
                (language === 'am-ET'
                  ? '«ዳታ አናሊቲክስ ምረጥ»፣ «ተግባቦት ምረጥ»፣ «1» ወይም «አወዳድር» ይበሉ...'
                  : 'Say "Select Data Analytics", "Select Communication", or "Compare"...')}
            </p>

            {/* Spoken Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVoiceCommand(voiceInputText);
                setVoiceInputText('');
              }}
              className="pt-2 flex items-center gap-2"
              aria-label="Course selection voice input form"
            >
              <label htmlFor="course-voice-input" className="sr-only">
                Speak or type course choice
              </label>
              <input
                id="course-voice-input"
                type="text"
                value={voiceInputText}
                onChange={(e) => setVoiceInputText(e.target.value)}
                placeholder="Speak hands-free, or type e.g. 'Data Analytics', 'WR 100', 'compare'..."
                className="flex-1 min-h-[44px] bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400"
              />

              <button
                type="button"
                onClick={toggleListening}
                className={`min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl font-bold flex items-center justify-center transition-colors shadow-sm ${isListening
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#0B132B] hover:bg-[#152248] text-orange-400'
                  }`}
                aria-label={isListening ? 'Pause listening' : 'Listen with microphone'}
                aria-pressed={isListening}
              >
                {isListening ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-orange-400" />}
              </button>

              <button
                type="submit"
                className="min-h-[44px] min-w-[44px] px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer transition-colors"
              >
                <span>Send</span>
                <Send className="w-4 h-4 text-white" aria-hidden="true" />
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Course Cards Grid */}
      <section aria-labelledby="available-courses-title" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 id="available-courses-title" className="text-2xl font-bold text-slate-900">
            Available Programmes ({filteredCourses.length})
          </h2>

          <div className="flex items-center gap-2" role="group" aria-label="Filter courses">
            <button
              type="button"
              onClick={() => setFilterLevel('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${filterLevel === 'all'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              All Courses
            </button>
            <button
              type="button"
              onClick={() => setFilterLevel('comprehensive')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${filterLevel === 'comprehensive'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              Comprehensive
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list">
          {filteredCourses.map((course) => (
            <article
              key={course.id}
              role="listitem"
              className={`bg-white border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 ${selectedCourseId === course.id
                  ? 'border-orange-500 ring-4 ring-orange-400/40'
                  : 'border-slate-300'
                }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded-full font-mono">
                    {course.code}
                  </span>
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    {course.duration}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="text-xs font-semibold text-slate-800 block">Syllabus modules:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {course.syllabus.map((item) => (
                      <span
                        key={item}
                        className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>{course.audioMinutes} min Audio Narration &amp; Live Quizzes</span>
                </div>
              </div>

              {/* Actions: Clean solid buttons without strokes */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectCourse(course)}
                  id={`select-${course.id}-btn`}
                  className="w-full min-h-[48px] bg-[#0B132B] hover:bg-[#152248] text-orange-400 hover:text-orange-300 font-bold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 cursor-pointer transition-colors"
                >
                  <span>Select &amp; Start Lessons</span>
                  <ArrowRight className="w-4 h-4 text-orange-400" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => handleReadDetails(course)}
                  className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer transition-colors"
                  aria-label={`Hear Course Description Aloud for ${course.title}`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span>Hear Course Description Aloud</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Support Callout */}
      <aside aria-label="Course assistance" className="bg-slate-50 border border-slate-300 rounded-xl p-6 text-center space-y-2">
        <p className="text-sm text-slate-700">
          Unsure which path is right for your career goals?
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <Link
            href="/payment#human-help"
            className="inline-flex items-center gap-1 text-sm font-bold text-orange-800 hover:text-orange-950 underline"
          >
            <span>Ask a Human Helper for Guidance</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
