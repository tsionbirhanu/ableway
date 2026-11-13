"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { useA11y } from "@/core/a11y/a11y-context";
import { useEarcons } from "@/hooks/use-earcons";
import { VoiceMicButton } from "@/components/voice/voice-mic-button";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { MessageSquare, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function FeedbackPage() {
  const { speak } = useA11y();
  const { play } = useEarcons();
  const { isListening, toggleListening, transcript } = useVoiceAssistant();

  const [featureTag, setFeatureTag] = useState("general");
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Auto-populate when spoken
  React.useEffect(() => {
    if (transcript) {
      setFeedbackText(transcript);
    }
  }, [transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    play("success");
    setSubmitted(true);
    speak(
      "Thank you for your feedback! It has been logged for our co-design team review."
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <AppHeader />

      <main id="main-content" className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:px-6 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="space-y-1">
          <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            FR-9.1 &amp; CD-5 &bull; Co-Design Feedback
          </span>
          <h1 className="text-3xl font-extrabold text-white">Share Your Feedback</h1>
          <p className="text-slate-400 text-sm">
            Your insights directly shape our accessibility design. Speak or type your thoughts.
          </p>
        </div>

        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl"
          >
            <div className="space-y-2">
              <label htmlFor="feature-tag" className="block text-sm font-semibold text-slate-200">
                What are you reporting on?
              </label>
              <select
                id="feature-tag"
                value={featureTag}
                onChange={(e) => setFeatureTag(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="general">General Platform Experience</option>
                <option value="voice-navigation">Voice Navigation &amp; Speech</option>
                <option value="screen-reader">Screen Reader Compatibility</option>
                <option value="course-content">Course Content &amp; Audio Lessons</option>
                <option value="ai-tutor">AI Tutor Answers</option>
                <option value="jobs-portal">Jobs &amp; Application Process</option>
              </select>
            </div>

            <div className="space-y-3">
              <label htmlFor="feedback-text" className="block text-sm font-semibold text-slate-200">
                Your Feedback or Issue Description:
              </label>
              <div className="flex items-center gap-4">
                <VoiceMicButton isListening={isListening} onToggle={toggleListening} />
                <textarea
                  id="feedback-text"
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Speak with the mic or type here..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!feedbackText.trim()}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-lg cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              <span>Submit Feedback</span>
            </button>
          </form>
        ) : (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-4 shadow-xl">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" aria-hidden="true" />
            <h2 className="text-xl font-bold text-white">Feedback Received!</h2>
            <p className="text-slate-300 text-sm">
              Thank you for contributing to the co-design and accessibility refinement of Ableway.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

