"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { useA11y } from "@/core/a11y/a11y-context";
import { VoiceMicButton } from "@/components/voice/voice-mic-button";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { ArrowLeft, Check, Volume2, Sparkles } from "lucide-react";

const INTERVIEW_QUESTIONS = [
  {
    key: "fullName",
    prompt: "What is your full name?",
    hint: "Speak your first and last name.",
  },
  {
    key: "headline",
    prompt: "What is your professional title or desired job role?",
    hint: "For example: Virtual Assistant, Customer Support Specialist, or Communications Associate.",
  },
  {
    key: "topSkills",
    prompt: "What are your 3 strongest professional skills?",
    hint: "For example: Verbal articulation, email management, active listening.",
  },
  {
    key: "summary",
    prompt: "In a few sentences, describe your background and what you are passionate about.",
    hint: "Speak naturally about your experience and career goals.",
  },
];

export default function VoiceCVBuilderPage() {
  const { speak } = useA11y();
  const { isListening, toggleListening, transcript } = useVoiceAssistant();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    fullName: "Björn Sibanda",
    headline: "Professional Communications Specialist",
    topSkills: "Verbal Articulation, Active Listening, Email Etiquette",
    summary:
      "Passionate communicator trained in structured verbal delivery and customer interaction, skilled in remote team collaboration.",
  });
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ = INTERVIEW_QUESTIONS[currentStep];

  useEffect(() => {
    if (!isCompleted && currentQ) {
      speak(`Question ${currentStep + 1} of ${INTERVIEW_QUESTIONS.length}: ${currentQ.prompt}`);
    }
  }, [currentStep, isCompleted, currentQ, speak]);

  // If user speaks transcript, populate answer
  useEffect(() => {
    if (transcript && currentQ) {
      setAnswers((prev) => ({ ...prev, [currentQ.key]: transcript }));
    }
  }, [transcript, currentQ]);

  const handleNext = () => {
    if (currentStep < INTERVIEW_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      speak(
        "Voice CV interview complete! Your accessible CV profile has been generated. You can review it by audio or edit any field."
      );
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const reviewCV = () => {
    const speech = `CV Profile for ${answers.fullName}. Professional title: ${answers.headline}. Top skills: ${answers.topSkills}. Professional summary: ${answers.summary}.`;
    speak(speech);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <AppHeader />

      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Jobs</span>
        </Link>

        <div className="space-y-1">
          <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            FR-6.5 &bull; Voice Interview Engine
          </span>
          <h1 className="text-3xl font-extrabold text-white">Voice-Guided CV Builder</h1>
          <p className="text-slate-400 text-sm">
            Build your professional profile one question at a time using spoken answers or keyboard.
          </p>
        </div>

        {!isCompleted ? (
          <section
            aria-labelledby="step-heading"
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400 font-mono">
                Step {currentStep + 1} of {INTERVIEW_QUESTIONS.length}
              </span>
              <button
                type="button"
                onClick={() => speak(currentQ.prompt)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                aria-label="Repeat current question"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Repeat Question</span>
              </button>
            </div>

            <div className="space-y-2">
              <h2 id="step-heading" className="text-xl sm:text-2xl font-bold text-white">
                {currentQ.prompt}
              </h2>
              <p className="text-slate-400 text-sm">{currentQ.hint}</p>
            </div>

            {/* Answer Field with Mic */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <VoiceMicButton isListening={isListening} onToggle={toggleListening} size="large" />
                <div className="flex-1">
                  <textarea
                    rows={3}
                    value={answers[currentQ.key] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [currentQ.key]: e.target.value }))
                    }
                    placeholder="Speak your answer with the mic, or type here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    aria-label={currentQ.prompt}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg transition focus:outline-none focus:ring-4 focus:ring-emerald-300 cursor-pointer"
              >
                {currentStep === INTERVIEW_QUESTIONS.length - 1 ? "Finish & Review" : "Next Question"}
              </button>
            </div>
          </section>
        ) : (
          /* Completed Spoken Profile Summary */
          <section
            aria-labelledby="summary-heading"
            className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Generated Spoken CV
                </span>
                <h2 id="summary-heading" className="text-2xl font-bold text-white mt-1">
                  {answers.fullName}
                </h2>
                <span className="text-sm text-slate-300">{answers.headline}</span>
              </div>

              <button
                type="button"
                onClick={reviewCV}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg"
                aria-label="Review entire CV by spoken audio"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Hear Full Spoken CV</span>
              </button>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-slate-200">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Skills Profile:
                </h3>
                <p className="mt-1 font-mono text-emerald-300">{answers.topSkills}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Executive Summary:
                </h3>
                <p className="mt-1 text-slate-300">{answers.summary}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCompleted(false)}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Edit responses
              </button>

              <Link
                href="/jobs"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Save &amp; Return to Jobs</span>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

