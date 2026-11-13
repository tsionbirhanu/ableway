"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AccessibleAudioPlayer } from "@/components/audio-player/accessible-audio-player";
import { useA11y } from "@/lib/a11y/a11y-context";
import { useEarcons } from "@/hooks/use-earcons";
import { Bot, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function LessonDetailPage() {
  const { speak } = useA11y();
  const { play } = useEarcons();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const lessonData = {
    title: "Week 10: Deliverables & Verbal Articulation",
    courseCode: "WR 100",
    courseTitle: "Fundamentals of Effective Communication",
    transcript:
      "Welcome to Week 10 of Fundamentals of Effective Communication. In today's session, we focus on the art of structured verbal delivery. When communicating in a remote team or virtual workplace, clarity and cadence are vital. Structure your remarks using the three-point rule: state your core premise, deliver your key supporting evidence, and conclude with the clear call to action.",
    quiz: {
      question: "According to the lesson, what is the three-point rule for professional delivery?",
      options: [
        "Premise, Supporting Evidence, and Call to Action",
        "Greeting, Casual Chat, and Sign-off",
        "Introduction, Apology for delays, and Summary",
      ],
      correctIndex: 0,
      explanation:
        "Correct! The three-point rule directs you to state your premise, present supporting evidence, and close with a clear call to action.",
    },
  };

  const handleAnswer = (index: number) => {
    setSelectedOption(index);
    if (index === lessonData.quiz.correctIndex) {
      play("success");
      setFeedback(lessonData.quiz.explanation);
      speak(lessonData.quiz.explanation);
    } else {
      play("error");
      const msg = "That is not quite right. Try reviewing the core premise section and try again.";
      setFeedback(msg);
      speak(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <AppHeader />

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb / Back button */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Courses</span>
        </Link>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            {lessonData.courseCode} &bull; Lesson Player
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{lessonData.title}</h1>
        </div>

        {/* Audio Player Component */}
        <AccessibleAudioPlayer
          title={lessonData.title}
          transcript={lessonData.transcript}
        />

        {/* Interactive Practice Quiz Section */}
        <section
          aria-labelledby="quiz-heading"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 id="quiz-heading" className="text-lg font-bold text-white">
              Interactive Comprehension Check
            </h2>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded">
              Spoken Assessment
            </span>
          </div>

          <p className="text-slate-200 text-base font-medium">{lessonData.quiz.question}</p>

          <fieldset className="space-y-3">
            <legend className="sr-only">Choose one answer:</legend>
            {lessonData.quiz.options.map((opt, i) => (
              <label
                key={opt}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition focus-within:ring-2 focus-within:ring-emerald-400 ${
                  selectedOption === i
                    ? "bg-emerald-950/60 border-emerald-500 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <input
                  type="radio"
                  name="lesson-quiz"
                  checked={selectedOption === i}
                  onChange={() => handleAnswer(i)}
                  className="h-5 w-5 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium">{opt}</span>
              </label>
            ))}
          </fieldset>

          {/* Feedback banner */}
          {feedback && (
            <div
              role="alert"
              className="p-4 bg-emerald-900/40 border border-emerald-600/50 rounded-xl text-emerald-200 text-sm flex items-start gap-2.5"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-none mt-0.5" aria-hidden="true" />
              <p>{feedback}</p>
            </div>
          )}
        </section>

        {/* Ask Tutor Section */}
        <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-white">Unclear about any concept?</h3>
            <p className="text-slate-300 text-sm">
              The AI tutor is grounded in this lesson's transcript and ready to explain by voice.
            </p>
          </div>
          <Link
            href="/tutor"
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl shadow transition flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-purple-300 flex-none"
          >
            <Bot className="h-4 w-4" aria-hidden="true" />
            <span>Ask Tutor</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

