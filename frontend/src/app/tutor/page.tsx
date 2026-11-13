"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { useA11y } from "@/core/a11y/a11y-context";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { VoiceMicButton } from "@/components/voice/voice-mic-button";
import { Bot, Send, ThumbsUp, ThumbsDown, Volume2, Square } from "lucide-react";
import { TutorMessage } from "@/types/tutor";

export default function TutorPage() {
  const { speak, stopSpeaking } = useA11y();
  const { isListening, toggleListening, transcript } = useVoiceAssistant();

  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: "1",
      sender: "tutor",
      content:
        "Hello! I am your Ableway AI tutor. I can explain any concept from your courses, give you examples, or quiz you on what you have learned. What would you like to explore today?",
      timestamp: 1700000000000,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    speak(
      "AI Tutor active. Ask questions by speaking or typing. Say 'Help' or press the microphone button to start."
    );
  }, [speak]);

  // If transcript changes from voice assistant, optionally populate input
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isReplying) return;

    const userMsg: TutorMessage = {
      id: String(Date.now()),
      sender: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsReplying(true);

    // Mock intelligent context response (in production connects to /api/tutor or Supabase Edge Function)
    setTimeout(async () => {
      let replyContent = `Regarding "${text}": in professional communication, the key is keeping your message concise and outcome-focused. Break your explanation into simple, logical steps.`;
      if (text.toLowerCase().includes("three-point") || text.toLowerCase().includes("deliverable")) {
        replyContent =
          "The three-point rule consists of: first stating your core premise, second providing supporting evidence, and third giving a clear call to action.";
      }

      const tutorMsg: TutorMessage = {
        id: String(Date.now() + 1),
        sender: "tutor",
        content: replyContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, tutorMsg]);
      setIsReplying(false);
      await speak(replyContent);
    }, 1000);
  };

  const handleRate = (id: string, isHelpful: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isHelpful } : m))
    );
    speak(isHelpful ? "Thank you for the feedback." : "Feedback noted. We will improve this response.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <AppHeader />

      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:px-6 flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Spoken Tutor</h1>
              <span className="text-xs text-purple-400 font-medium">Grounded in WR 100 &amp; VA-1</span>
            </div>
          </div>

          <button
            type="button"
            onClick={stopSpeaking}
            className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            aria-label="Stop audio"
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Interrupt / Stop Audio</span>
          </button>
        </div>

        {/* Message Stream */}
        <section
          aria-label="Conversation with AI Tutor"
          className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 overflow-y-auto space-y-4 shadow-inner max-h-[60vh]"
        >
          {messages.map((msg) => {
            const isTutor = msg.sender === "tutor";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isTutor ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isTutor
                      ? "bg-purple-950/60 border border-purple-500/30 text-purple-100"
                      : "bg-emerald-600 text-white font-medium"
                  }`}
                >
                  {isTutor && (
                    <div className="flex items-center justify-between text-xs text-purple-300 mb-1.5 font-mono">
                      <span>AI Tutor</span>
                      <button
                        type="button"
                        onClick={() => speak(msg.content)}
                        className="hover:text-white flex items-center gap-1 cursor-pointer"
                        aria-label="Re-speak this answer"
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Repeat</span>
                      </button>
                    </div>
                  )}

                  <p>{msg.content}</p>

                  {/* Feedback Controls for Tutor (FR-4.8) */}
                  {isTutor && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-purple-800/40 text-xs">
                      <span className="text-purple-300/80">Helpful?</span>
                      <button
                        type="button"
                        onClick={() => handleRate(msg.id, true)}
                        className={`p-1 rounded hover:bg-purple-900/60 transition cursor-pointer ${
                          msg.isHelpful === true ? "text-emerald-400 font-bold" : "text-purple-300"
                        }`}
                        aria-label="Rate answer helpful"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate(msg.id, false)}
                        className={`p-1 rounded hover:bg-purple-900/60 transition cursor-pointer ${
                          msg.isHelpful === false ? "text-rose-400 font-bold" : "text-purple-300"
                        }`}
                        aria-label="Rate answer not helpful"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </section>

        {/* Voice and Text Input Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-xl">
          <VoiceMicButton isListening={isListening} onToggle={toggleListening} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex-1 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask by typing or press mic to speak..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label="Ask the AI Tutor a question"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isReplying}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
