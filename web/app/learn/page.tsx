"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, CheckCircle2, BookOpen, Volume2, ArrowRight } from "lucide-react";
import { useA11y } from "@/lib/a11y/a11y-context";
import { useAssistant } from "@/lib/assistant/assistant-context";
import { speechPlayer } from "@/lib/speech/client/player";

interface LessonItem {
  id: string;
  title: string;
  transcript: string;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  position?: number;
  imageDescription?: string;
}

interface QuestionItem {
  id: string;
  prompt: string;
  choices: string[];
  position?: number;
}

interface QuizItem {
  id: string;
  title: string;
  passMark: number;
  questions: QuestionItem[];
}

interface ModuleItem {
  id: string;
  title: string;
  lessons: LessonItem[];
  quizzes?: QuizItem[];
}

interface GradedQuestion {
  questionId: string;
  selectedChoice: number | null;
  correctChoice: number;
  isCorrect: boolean;
  explanation: string;
}

interface QuizSubmitResponse {
  quizId: string;
  quizTitle: string;
  score: number;
  passMark: number;
  passed: boolean;
  feedback: string;
  questions: GradedQuestion[];
}

const FALLBACK_MODULES: ModuleItem[] = [
  {
    id: "mod-1",
    title: "Module 1: Principles of Non-Visual Computing",
    lessons: [
      {
        id: "les-1",
        title: "Lesson 1: Introduction to Screen Reader Keyboard Architecture",
        transcript: `Welcome to Lesson 1. In non-visual computing, the screen reader replaces mouse interaction with hierarchical keyboard navigation. 
On Windows, NVDA and JAWS use the Insert key or CapsLock as the primary modifier key. 
Key headings can be jumped to instantly by pressing the "H" key, allowing you to scan document outlines quickly. 
Buttons are triggered with the Spacebar or Enter key, and Tab navigation moves linearly between focusable controls.`,
        imageDescription:
          "Diagram of a standard QWERTY keyboard highlighting the Home row (A-S-D-F and J-K-L-;) and modifier keys (Insert and CapsLock) with high-contrast outlines.",
      },
      {
        id: "les-2",
        title: "Lesson 2: ARIA Landmarks and Document Structure",
        transcript: `In this lesson, we explore ARIA landmarks. Web developers use semantic HTML tags such as main, nav, banner, and contentinfo to delineate page sections. 
By pressing the "D" key in NVDA, you can jump between landmarks effortlessly without listening to header repetition on every page load.`,
        imageDescription:
          "A simplified webpage wireframe divided into three clear geometric regions: Banner on top, Main navigation on the left, and Primary Content filling the right center.",
      },
    ],
    quizzes: [
      {
        id: "quiz-1",
        title: "Module 1 Knowledge Check",
        passMark: 70,
        questions: [
          {
            id: "q-1",
            prompt:
              "Which single key shortcut in modern screen readers allows you to jump sequentially through headings on a webpage?",
            choices: ["Tab key", "H key", "Shift + Down Arrow", "Enter key"],
          },
        ],
      },
    ],
  },
];

export default function LearnPage() {
  const { announce } = useA11y();
  const { setPageContext } = useAssistant();

  const [courseTitle, setCourseTitle] = useState("Digital Accessibility Fundamentals");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState("Lesson 1 of 2 completed (50%)");
  const [modules, setModules] = useState<ModuleItem[]>(FALLBACK_MODULES);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);

  // Quiz State
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [gradedResult, setGradedResult] = useState<QuizSubmitResponse | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  // Track position
  const currentAudioSecondsRef = useRef<number>(0);

  const currentModule = modules[activeModuleIndex] || modules[0] || FALLBACK_MODULES[0];
  const currentLesson =
    currentModule.lessons[activeLessonIndex] ||
    currentModule.lessons[0] ||
    FALLBACK_MODULES[0].lessons[0];
  const currentQuiz = currentModule.quizzes?.[0] || FALLBACK_MODULES[0].quizzes![0];
  const currentQuestion = currentQuiz.questions[0];

  // Prime assistant context whenever the active lesson changes
  useEffect(() => {
    if (currentLesson) {
      setPageContext({
        page: "/learn",
        courseId,
        lessonId: currentLesson.id,
        lessonTitle: currentLesson.title,
        lessonTranscript: currentLesson.transcript,
      });
    }
  }, [currentLesson, courseId, setPageContext]);

  // Load summary and resume progress on mount
  useEffect(() => {
    let isMounted = true;

    async function loadLearningState() {
      try {
        // 1. Fetch plain language summary
        const summaryRes = await fetch("/api/learn/summary");
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (isMounted && summaryData.summary) {
            setSummaryText(summaryData.summary);
          }
        }

        // 2. Fetch progress and resume position
        const progressRes = await fetch("/api/learn/progress");
        if (!progressRes.ok) return;

        const progressData = await progressRes.json();
        if (!isMounted) return;

        if (progressData.courseId) {
          setCourseId(progressData.courseId);
          if (progressData.courseTitle) {
            setCourseTitle(progressData.courseTitle);
          }

          // 3. Fetch course curriculum with active enrollment
          const courseRes = await fetch(`/api/learn/${progressData.courseId}`);
          if (courseRes.ok) {
            const courseData = await courseRes.json();
            if (isMounted && courseData.modules && courseData.modules.length > 0) {
              setModules(courseData.modules);

              // Navigate to resume lesson if available
              if (progressData.resumeLessonId) {
                for (let mIdx = 0; mIdx < courseData.modules.length; mIdx++) {
                  const foundLIdx = courseData.modules[mIdx].lessons.findIndex(
                    (l: LessonItem) => l.id === progressData.resumeLessonId,
                  );
                  if (foundLIdx !== -1) {
                    setActiveModuleIndex(mIdx);
                    setActiveLessonIndex(foundLIdx);
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Learning state fetch fallback used:", err);
      }
    }

    loadLearningState();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save progress helper
  const saveProgress = useCallback(
    async (completedLessonId?: string, audioSeconds?: number) => {
      if (!courseId) return;
      try {
        await fetch("/api/learn/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            completedLessonId,
            lastPosition: currentLesson?.id
              ? {
                  lessonId: currentLesson.id,
                  audioSeconds: audioSeconds ?? currentAudioSecondsRef.current,
                }
              : undefined,
          }),
        });
      } catch (e) {
        console.warn("Failed to save progress:", e);
      }
    },
    [courseId, currentLesson],
  );

  // Audio Playback Controls
  const toggleAudio = () => {
    if (typeof window === "undefined") return;

    if (isPlaying) {
      speechPlayer.cancel();
      setIsPlaying(false);
      announce("Audio playback paused.", "polite");
      void saveProgress(undefined, currentAudioSecondsRef.current);
    } else {
      setIsPlaying(true);
      announce("Starting audio lesson playback.", "polite");
      void speechPlayer
        .speak(currentLesson.transcript, { rate: playbackSpeed, volume })
        .then((completed) => {
          if (completed) {
            setIsPlaying(false);
            announce("Lesson playback completed.", "polite");
            void saveProgress(currentLesson.id);
          }
        });
    }
  };

  const handleRewind10 = () => {
    if (typeof window !== "undefined") {
      speechPlayer.cancel();
      setIsPlaying(true);
      announce("Rewound audio by 10 seconds.", "polite");
      void speechPlayer
        .speak(currentLesson.transcript, { rate: playbackSpeed, volume })
        .then((completed) => {
          if (completed) setIsPlaying(false);
        });
    }
  };

  const handleSpeedToggle = () => {
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);
    announce(`Playback speed set to ${newSpeed}x`, "polite");
  };

  const handleAnswerSelect = (questionId: string, choiceIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: choiceIndex,
    }));
  };

  // Server-side Quiz Submission
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion) return;

    const selectedChoice = selectedAnswers[currentQuestion.id];
    if (selectedChoice === undefined) {
      announce("Please choose an answer option before submitting the quiz.", "assertive");
      return;
    }

    setIsSubmittingQuiz(true);

    try {
      const res = await fetch(`/api/learn/quiz/${currentQuiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: {
            [currentQuestion.id]: selectedChoice,
          },
        }),
      });

      if (res.ok) {
        const data: QuizSubmitResponse = await res.json();
        setGradedResult(data);
        setQuizSubmitted(true);

        const exp = data.questions?.[0]?.explanation || "";
        const announceMsg = `${data.feedback} ${exp}`;
        announce(announceMsg, "polite");
      } else {
        // Offline / fallback grading
        setQuizSubmitted(true);
        const isFallbackCorrect = selectedChoice === 1; // 'H key' in fallback
        const fallbackFeedback = isFallbackCorrect
          ? 'Correct! Pressing the "H" key moves focus to the next heading on the page.'
          : 'Incorrect. The correct answer was "H key". Pressing the "H" key moves focus to the next heading on the page.';
        setGradedResult({
          quizId: currentQuiz.id,
          quizTitle: currentQuiz.title,
          score: isFallbackCorrect ? 100 : 0,
          passMark: 70,
          passed: isFallbackCorrect,
          feedback: fallbackFeedback,
          questions: [
            {
              questionId: currentQuestion.id,
              selectedChoice,
              correctChoice: 1,
              isCorrect: isFallbackCorrect,
              explanation:
                'Pressing the "H" key moves focus to the next heading on the page, allowing rapid hierarchical scanning.',
            },
          ],
        });
        announce(fallbackFeedback, "polite");
      }
    } catch {
      // Local fallback on network error
      setQuizSubmitted(true);
      const isFallbackCorrect = selectedChoice === 1;
      const fallbackFeedback = isFallbackCorrect
        ? 'Correct! Pressing the "H" key moves focus to the next heading on the page.'
        : 'Incorrect. The correct answer was "H key". Pressing the "H" key moves focus to the next heading on the page.';
      announce(fallbackFeedback, "polite");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Title & Plain-Language Summary (Rule 2) */}
      <header className="space-y-2">
        <h1 id="learn-h1" className="text-3xl font-extrabold text-white">
          {courseTitle}
        </h1>
        <p className="text-slate-200 text-sm">
          Progress: <strong className="text-emerald-400">{summaryText}</strong>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module Outline Sidebar (Native nav & ul) */}
        <aside className="space-y-4" aria-label="Course curriculum modules">
          <div className="p-5 bg-slate-900 border border-slate-700 rounded-2xl">
            <h2 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Curriculum Modules</span>
            </h2>
            <nav aria-label="Module lessons navigation">
              <ul className="space-y-3 list-none p-0 m-0">
                {modules.map((mod, mIdx) => (
                  <li key={mod.id} className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      {mod.title}
                    </span>
                    <ul className="space-y-1.5 pl-2 border-l-2 border-slate-700 list-none m-0">
                      {mod.lessons.map((les, lIdx) => (
                        <li key={les.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModuleIndex(mIdx);
                              setActiveLessonIndex(lIdx);
                              setIsQuizActive(false);
                              setQuizSubmitted(false);
                              announce(`Switched to ${les.title}`);
                            }}
                            className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold min-h-[44px] transition-colors flex items-center ${
                              activeModuleIndex === mIdx &&
                              activeLessonIndex === lIdx &&
                              !isQuizActive
                                ? "bg-emerald-800 text-white font-bold"
                                : "text-slate-200 hover:bg-slate-800"
                            }`}
                            aria-current={
                              activeModuleIndex === mIdx &&
                              activeLessonIndex === lIdx &&
                              !isQuizActive
                                ? "true"
                                : undefined
                            }
                          >
                            {les.title}
                          </button>
                        </li>
                      ))}
                      {mod.quizzes && mod.quizzes.length > 0 && (
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModuleIndex(mIdx);
                              setIsQuizActive(true);
                              announce(`Switched to quiz: ${mod.quizzes![0].title}`);
                            }}
                            className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold min-h-[44px] transition-colors flex items-center ${
                              activeModuleIndex === mIdx && isQuizActive
                                ? "bg-emerald-800 text-white font-bold"
                                : "text-slate-200 hover:bg-slate-800"
                            }`}
                            aria-current={
                              activeModuleIndex === mIdx && isQuizActive ? "true" : undefined
                            }
                          >
                            Quiz: {mod.quizzes[0].title}
                          </button>
                        </li>
                      )}
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
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase">
                  {currentModule.title}
                </span>
                <h2 id="lesson-heading" className="text-2xl font-bold text-white mt-1">
                  {currentLesson.title}
                </h2>
              </div>

              {/* Audio Controls Bar */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-300"
                    aria-label={isPlaying ? "Pause lesson audio" : "Play lesson audio"}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" aria-hidden="true" />
                    )}
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
                    <label htmlFor="audio-volume" className="text-slate-300 font-medium">
                      Volume:
                    </label>
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

              {/* Synchronized Text Transcript */}
              <section aria-labelledby="transcript-heading" className="space-y-3">
                <h3
                  id="transcript-heading"
                  className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>Lesson Transcript</span>
                </h3>
                <div className="p-5 bg-slate-950 rounded-2xl border border-slate-700 text-sm text-slate-100 leading-relaxed font-sans whitespace-pre-line">
                  {currentLesson.transcript}
                </div>
              </section>

              {/* Human-Written Image Description */}
              {currentLesson.imageDescription && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-700 text-xs text-slate-200 space-y-1">
                  <span className="font-bold text-emerald-400">
                    Visual Diagram Alternative (Human-Written):
                  </span>
                  <p>{currentLesson.imageDescription}</p>
                </div>
              )}

              {/* Action to Quiz */}
              {currentQuiz && (
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuizActive(true);
                      setQuizSubmitted(false);
                      setGradedResult(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs min-h-[44px] flex items-center gap-2"
                  >
                    <span>Take Module Quiz</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </article>
          ) : (
            /* Voice/Keyboard Quiz Container with Server-side Grading */
            <form
              onSubmit={handleQuizSubmit}
              className="p-6 sm:p-8 bg-slate-900 border border-slate-700 rounded-3xl space-y-6 shadow-xl"
            >
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase">
                  Assessment
                </span>
                <h2 id="quiz-heading" className="text-2xl font-bold text-white mt-1">
                  {currentQuiz.title}
                </h2>
              </div>

              {currentQuestion && (
                <fieldset className="p-5 bg-slate-950 rounded-2xl border border-slate-700 space-y-4 m-0">
                  <legend className="text-base font-bold text-white">
                    {currentQuestion.prompt}
                  </legend>

                  <div className="space-y-2">
                    {currentQuestion.choices.map((opt, idx) => {
                      const isSelected = selectedAnswers[currentQuestion.id] === idx;
                      const gradedQ = gradedResult?.questions?.find(
                        (q) => q.questionId === currentQuestion.id,
                      );
                      const isCorrectChoice = gradedQ ? gradedQ.correctChoice === idx : false;

                      return (
                        <label
                          key={idx}
                          htmlFor={`quiz-opt-${idx}`}
                          className={`w-full text-left p-3.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between min-h-[44px] cursor-pointer ${
                            isSelected
                              ? quizSubmitted
                                ? isCorrectChoice
                                  ? "bg-emerald-950 border-emerald-500 text-emerald-200"
                                  : "bg-red-950 border-red-500 text-red-200"
                                : "bg-slate-800 border-emerald-500 text-white"
                              : "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-850"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              id={`quiz-opt-${idx}`}
                              type="radio"
                              name="quiz-answer"
                              value={idx}
                              checked={isSelected}
                              onChange={() => handleAnswerSelect(currentQuestion.id, idx)}
                              className="w-5 h-5 text-emerald-600 bg-slate-900 border-slate-600 focus:ring-emerald-500"
                            />
                            <span>
                              {idx + 1}. {opt}
                            </span>
                          </div>
                          {quizSubmitted && isCorrectChoice && (
                            <CheckCircle2
                              className="w-5 h-5 text-emerald-400 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

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
                  disabled={isSubmittingQuiz}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs min-h-[44px] flex items-center gap-2"
                >
                  <span>{isSubmittingQuiz ? "Grading..." : "Submit Answer"}</span>
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {quizSubmitted && gradedResult && (
                <div
                  className="p-4 bg-slate-950 rounded-2xl border border-slate-700 text-xs text-slate-200 space-y-1"
                  aria-live="polite"
                >
                  <span className="font-bold text-white">Feedback:</span>
                  <p>{gradedResult.feedback}</p>
                  {gradedResult.questions?.[0]?.explanation && (
                    <p className="mt-1 text-slate-300">
                      <strong>Explanation:</strong> {gradedResult.questions[0].explanation}
                    </p>
                  )}
                </div>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
