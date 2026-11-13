'use client';

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, CheckCircle2, BookOpen, Volume2, HelpCircle, ArrowRight } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';

export default function LearnPage() {
  const { announce, speechRate, setSpeechRate } = useA11y();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);

  // Quiz State
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const modules = [
    {
      id: 'mod-1',
      title: 'Module 1: Principles of Non-Visual Computing',
      lessons: [
        {
          id: 'les-1',
          title: 'Lesson 1: Introduction to Screen Reader Keyboard Architecture',
          audioDuration: '5 mins',
          transcript: `Welcome to Lesson 1. In non-visual computing, the screen reader replaces mouse interaction with hierarchical keyboard navigation. 
On Windows, NVDA and JAWS use the Insert key or CapsLock as the primary modifier key. 
Key headings can be jumped to instantly by pressing the "H" key, allowing you to scan document outlines at triple the speed of sighted reading. 
Buttons are triggered with the Spacebar or Enter key, and tab navigation moves linearly between focusable interactive controls.`,
          imageDescription: 'Diagram of a standard QWERTY keyboard highlighting the Home row (A-S-D-F and J-K-L-;) and modifier keys (Insert and CapsLock) in high-contrast yellow outlines.',
        },
        {
          id: 'les-2',
          title: 'Lesson 2: ARIA Landmarks and Document Structure',
          audioDuration: '7 mins',
          transcript: `In this lesson, we explore ARIA landmarks. Web developers use semantic HTML tags such as main, nav, banner, and contentinfo to delineate page sections. 
By pressing the "D" key in NVDA, you can jump between landmarks effortlessly without listening to header repetition on every page load.`,
          imageDescription: 'A simplified webpage wireframe divided into three clear geometric regions: Banner on top, Main navigation on the left, and Primary Content filling the right center.',
        },
      ],
      quiz: {
        title: 'Module 1 Knowledge Check',
        question: 'Which single key shortcut in modern screen readers allows you to jump sequentially through headings on a webpage?',
        options: ['Tab key', 'H key', 'Shift + Down Arrow', 'Enter key'],
        correctIndex: 1,
        explanation: 'Pressing the "H" key moves focus to the next heading on the page, allowing rapid hierarchical scanning without tabbing through every link.',
      },
    },
  ];

  const currentModule = modules[activeModuleIndex];
  const currentLesson = currentModule.lessons[activeLessonIndex];

  const toggleAudio = () => {
    if (typeof window === 'undefined') return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      announce('Audio playback paused.');
    } else {
      setIsPlaying(true);
      announce('Starting audio lesson playback.');
      const utter = new SpeechSynthesisUtterance(currentLesson.transcript);
      utter.rate = playbackSpeed;
      utter.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utter);
    }
  };

  const handleRewind = () => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsPlaying(true);
      announce('Rewinding to beginning of lesson.');
      const utter = new SpeechSynthesisUtterance(currentLesson.transcript);
      utter.rate = playbackSpeed;
      utter.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utter);
    }
  };

  const handleSpeedToggle = () => {
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);
    announce(`Playback speed set to ${newSpeed}x`);
  };

  const handleQuizAnswer = (idx: number) => {
    setSelectedAnswer(idx);
    setQuizSubmitted(true);
    const isCorrect = idx === currentModule.quiz.correctIndex;
    const msg = isCorrect
      ? `Correct! ${currentModule.quiz.explanation}`
      : `Incorrect. The correct answer was ${currentModule.quiz.options[currentModule.quiz.correctIndex]}. ${currentModule.quiz.explanation}`;
    announce(msg);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
          <span>FR-5.1 to FR-5.8: Accessible Learning Platform</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Digital Accessibility Fundamentals</h1>
        <p className="text-slate-300 text-sm">
          Progress: <strong className="text-emerald-400">Lesson 1 of 4 completed (25%)</strong>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module Outline Sidebar */}
        <aside className="space-y-4" aria-label="Course curriculum modules">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <h2 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Curriculum Modules</span>
            </h2>
            <nav className="space-y-2">
              {modules.map((mod, mIdx) => (
                <div key={mod.id} className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{mod.title}</span>
                  <div className="space-y-1 pl-2 border-l-2 border-slate-800">
                    {mod.lessons.map((les, lIdx) => (
                      <button
                        key={les.id}
                        type="button"
                        onClick={() => {
                          setActiveLessonIndex(lIdx);
                          setIsQuizActive(false);
                          announce(`Switched to ${les.title}`);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs font-medium transition-colors ${
                          activeLessonIndex === lIdx && !isQuizActive
                            ? 'bg-emerald-800 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {les.title}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuizActive(true);
                        announce(`Switched to ${mod.quiz.title}`);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs font-medium transition-colors ${
                        isQuizActive
                          ? 'bg-emerald-800 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Quiz: {mod.quiz.title}
                    </button>
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Lesson Player or Quiz */}
        <main className="lg:col-span-2 space-y-6">
          {!isQuizActive ? (
            <article className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase">{currentModule.title}</span>
                <h2 className="text-2xl font-bold text-white mt-1">{currentLesson.title}</h2>
              </div>

              {/* Audio Controls Bar (FR-5.2) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleAudio}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-400"
                    aria-label={isPlaying ? 'Pause lesson audio' : 'Play lesson audio'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>

                  <button
                    onClick={handleRewind}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full"
                    aria-label="Rewind to start of lesson"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Speed:</span>
                  <button
                    onClick={handleSpeedToggle}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold rounded-lg border border-slate-700"
                    aria-label={`Playback speed ${playbackSpeed}x, click to adjust`}
                  >
                    {playbackSpeed}x
                  </button>
                </div>
              </div>

              {/* Synchronized Text Transcript (FR-5.2) */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Lesson Transcript</span>
                </h3>
                <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                  {currentLesson.transcript}
                </div>
              </div>

              {/* Human-Written Image Description (FR-5.7) */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-semibold text-emerald-400">Visual Diagram Alternative (Human-Written):</span>
                <p>{currentLesson.imageDescription}</p>
              </div>

              {/* Action: Next to Quiz */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsQuizActive(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2"
                >
                  <span>Take Module Quiz</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </article>
          ) : (
            /* Voice/Keyboard Quiz Container (FR-5.3) */
            <article className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase">Assessment</span>
                <h2 className="text-2xl font-bold text-white mt-1">{currentModule.quiz.title}</h2>
              </div>

              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                <p className="text-base font-semibold text-white">{currentModule.quiz.question}</p>

                <div className="space-y-2" role="radiogroup" aria-label={currentModule.quiz.question}>
                  {currentModule.quiz.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      role="radio"
                      aria-checked={selectedAnswer === idx}
                      onClick={() => handleQuizAnswer(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                        selectedAnswer === idx
                          ? idx === currentModule.quiz.correctIndex
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                            : 'bg-red-950 border-red-500 text-red-200'
                          : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span>{idx + 1}. {opt}</span>
                      {selectedAnswer === idx && idx === currentModule.quiz.correctIndex && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {quizSubmitted && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1" aria-live="polite">
                  <span className="font-bold text-white">Explanation:</span>
                  <p>{currentModule.quiz.explanation}</p>
                </div>
              )}
            </article>
          )}
        </main>
      </div>
    </div>
  );
}
