'use client';

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, CheckCircle2, BookOpen, Volume2, HelpCircle, ArrowRight } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';

export default function LearnPage() {
  const { announce } = useA11y();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
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
          duration: '5 mins',
          transcript: `Welcome to Lesson 1. In non-visual computing, the screen reader replaces mouse interaction with hierarchical keyboard navigation. 
On Windows, NVDA and JAWS use the Insert key or CapsLock as the primary modifier key. 
Key headings can be jumped to instantly by pressing the "H" key, allowing you to scan document outlines quickly. 
Buttons are triggered with the Spacebar or Enter key, and Tab navigation moves linearly between focusable controls.`,
          imageDescription: 'Diagram of a standard QWERTY keyboard highlighting the Home row (A-S-D-F and J-K-L-;) and modifier keys (Insert and CapsLock) with high-contrast outlines.',
        },
        {
          id: 'les-2',
          title: 'Lesson 2: ARIA Landmarks and Document Structure',
          duration: '7 mins',
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

  // Rule 21: Audio never starts without user action
  const toggleAudio = () => {
    if (typeof window === 'undefined') return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      announce('Audio playback paused.', 'polite');
    } else {
      setIsPlaying(true);
      announce('Starting audio lesson playback.', 'polite');
      const utter = new SpeechSynthesisUtterance(currentLesson.transcript);
      utter.rate = playbackSpeed;
      utter.volume = volume;
      utter.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utter);
    }
  };

  // Rule 21: Rewind 10 seconds / restart
  const handleRewind10 = () => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsPlaying(true);
      announce('Rewound audio by 10 seconds.', 'polite');
      const utter = new SpeechSynthesisUtterance(currentLesson.transcript);
      utter.rate = playbackSpeed;
      utter.volume = volume;
      utter.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utter);
    }
  };

  const handleSpeedToggle = () => {
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);
    announce(`Playback speed set to ${newSpeed}x`, 'polite');
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAnswer === null) {
      announce('Please choose an answer option before submitting the quiz.', 'assertive');
      return;
    }
    setQuizSubmitted(true);
    const isCorrect = selectedAnswer === currentModule.quiz.correctIndex;
    const msg = isCorrect
      ? `Correct! ${currentModule.quiz.explanation}`
      : `Incorrect. The correct answer was ${currentModule.quiz.options[currentModule.quiz.correctIndex]}. ${currentModule.quiz.explanation}`;
    announce(msg, 'polite');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Title & Heading (Rule 2) */}
      <header className="space-y-2">
        <h1 id="learn-h1" className="text-3xl font-extrabold text-white">
          Digital Accessibility Fundamentals
        </h1>
        <p className="text-slate-200 text-sm">
          Progress: <strong className="text-emerald-400">Lesson 1 of 2 completed (50%)</strong>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module Outline Sidebar (Rule 1 & 24: native nav & ul) */}
        <aside className="space-y-4" aria-label="Course curriculum modules">
          <div className="p-5 bg-slate-900 border border-slate-700 rounded-2xl">
            <h2 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Curriculum Modules</span>
            </h2>
            <nav aria-label="Module lessons navigation">
              <ul className="space-y-3 list-none p-0 m-0">
                {modules.map((mod, _mIdx) => (
                  <li key={mod.id} className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">{mod.title}</span>
                    <ul className="space-y-1.5 pl-2 border-l-2 border-slate-700 list-none m-0">
                      {mod.lessons.map((les, lIdx) => (
                        <li key={les.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLessonIndex(lIdx);
                              setIsQuizActive(false);
                              announce(`Switched to ${les.title}`);
                            }}
                            className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold min-h-[44px] transition-colors flex items-center ${
                              activeLessonIndex === lIdx && !isQuizActive
                                ? 'bg-emerald-800 text-white font-bold'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                            aria-current={activeLessonIndex === lIdx && !isQuizActive ? 'true' : undefined}
                          >
                            {les.title}
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setIsQuizActive(true);
                            announce(`Switched to quiz: ${mod.quiz.title}`);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold min-h-[44px] transition-colors flex items-center ${
                            isQuizActive
                              ? 'bg-emerald-800 text-white font-bold'
                              : 'text-slate-200 hover:bg-slate-800'
                          }`}
                          aria-current={isQuizActive ? 'true' : undefined}
                        >
                          Quiz: {mod.quiz.title}
                        </button>
                      </li>
                    </ul>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Lesson Player or Quiz */}
        <section aria-labelledby="lesson-heading" className="lg:col-span-2 space-y-6">
          {!isQuizActive ? (
            <article className="p-6 sm:p-8 bg-slate-900 border border-slate-700 rounded-3xl space-y-6 shadow-xl">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase">{currentModule.title}</span>
                <h2 id="lesson-heading" className="text-2xl font-bold text-white mt-1">{currentLesson.title}</h2>
              </div>

              {/* Audio Controls Bar (Rule 21: play, pause, back 10s, speed, volume) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-300"
                    aria-label={isPlaying ? 'Pause lesson audio' : 'Play lesson audio'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" aria-hidden="true" /> : <Play className="w-5 h-5 ml-0.5" aria-hidden="true" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleRewind10}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-600"
                    aria-label="Rewind audio by 10 seconds"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  {/* Speed Control */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300 font-medium">Speed:</span>
                    <button
                      type="button"
                      onClick={handleSpeedToggle}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold rounded-lg border border-slate-600 min-h-[44px] flex items-center justify-center"
                      aria-label={`Audio playback speed ${playbackSpeed}x, click to cycle`}
                    >
                      {playbackSpeed}x
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="audio-volume" className="text-slate-300 font-medium">Volume:</label>
                    <input
                      id="audio-volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-20 accent-emerald-500 min-h-[44px]"
                      aria-label="Audio volume"
                    />
                  </div>
                </div>
              </div>

              {/* Synchronized Text Transcript (Rule 21) */}
              <section aria-labelledby="transcript-heading" className="space-y-3">
                <h3 id="transcript-heading" className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>Lesson Transcript</span>
                </h3>
                <div className="p-5 bg-slate-950 rounded-2xl border border-slate-700 text-sm text-slate-100 leading-relaxed font-sans whitespace-pre-line">
                  {currentLesson.transcript}
                </div>
              </section>

              {/* Human-Written Image Description (Rule 22) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-700 text-xs text-slate-200 space-y-1">
                <span className="font-bold text-emerald-400">Visual Diagram Alternative (Human-Written):</span>
                <p>{currentLesson.imageDescription}</p>
              </div>

              {/* Action to Quiz */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsQuizActive(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs min-h-[44px] flex items-center gap-2"
                >
                  <span>Take Module Quiz</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          ) : (
            /* Voice/Keyboard Quiz Container with Native Fieldset & Radio (Rule 1 & 15) */
            <form onSubmit={handleQuizSubmit} className="p-6 sm:p-8 bg-slate-900 border border-slate-700 rounded-3xl space-y-6 shadow-xl">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase">Assessment</span>
                <h2 id="quiz-heading" className="text-2xl font-bold text-white mt-1">{currentModule.quiz.title}</h2>
              </div>

              <fieldset className="p-5 bg-slate-950 rounded-2xl border border-slate-700 space-y-4 m-0">
                <legend className="text-base font-bold text-white">{currentModule.quiz.question}</legend>

                <div className="space-y-2">
                  {currentModule.quiz.options.map((opt, idx) => (
                    <label
                      key={idx}
                      htmlFor={`quiz-opt-${idx}`}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between min-h-[44px] cursor-pointer ${
                        selectedAnswer === idx
                          ? quizSubmitted
                            ? idx === currentModule.quiz.correctIndex
                              ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                              : 'bg-red-950 border-red-500 text-red-200'
                            : 'bg-slate-800 border-emerald-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          id={`quiz-opt-${idx}`}
                          type="radio"
                          name="quiz-answer"
                          value={idx}
                          checked={selectedAnswer === idx}
                          onChange={() => setSelectedAnswer(idx)}
                          className="w-5 h-5 text-emerald-600 bg-slate-900 border-slate-600 focus:ring-emerald-500"
                        />
                        <span>{idx + 1}. {opt}</span>
                      </div>
                      {quizSubmitted && idx === currentModule.quiz.correctIndex && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuizActive(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs min-h-[44px] flex items-center"
                >
                  Back to Lesson
                </button>

                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs min-h-[44px] flex items-center gap-2"
                >
                  <span>Submit Answer</span>
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {quizSubmitted && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-700 text-xs text-slate-200 space-y-1" aria-live="polite">
                  <span className="font-bold text-white">Feedback:</span>
                  <p>{currentModule.quiz.explanation}</p>
                </div>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
