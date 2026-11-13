'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  PhoneCall,
  Volume2,
  VolumeX,
  X,
  Square,
  RotateCcw,
  Check,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { useAssistant } from '@/lib/assistant/assistant-context';

export function WebAssistantPanel() {
  const {
    conversation,
    status,
    mode,
    isOpen,
    isListening,
    isSpeaking,
    isMuted,
    pendingAction,
    helpStatus,
    helpRequestId,
    errorMessage,
    micPermissionState,
    setIsOpen,
    toggleOpen,
    setIsMuted,
    sendMessage,
    startListening,
    stopListening,
    toggleListening,
    stopSpeaking,
    repeatLastMessage,
    callPerson,
    confirmAction,
    cancelAction,
    requestMicPermission,
    explainMicPermission,
    dismissMicExplanation,
  } = useAssistant();

  const [inputText, setInputText] = useState('');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript log when new messages arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [conversation]);

  // Handle focus when opening panel
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Escape key handler: closes non-modal panel and returns focus to trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <>
      {/* Rule 12: Persistent button in same location, 44x44px minimum touch target */}
      <button
        ref={triggerRef}
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 min-h-[48px] min-w-[48px] rounded-full shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-300 transition-transform active:scale-95"
        aria-label={`Ableway Assistant. ${isOpen ? 'Close' : 'Open'} panel. Keyboard shortcut: Alt+Shift+A.`}
        aria-expanded={isOpen}
        aria-controls="assistant-nonmodal-panel"
      >
        <span className="relative flex h-3 w-3" aria-hidden="true">
          {status === 'listening' ? (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          ) : status === 'speaking' ? (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          ) : null}
          <span
            className={`relative inline-flex rounded-full h-3 w-3 ${
              status === 'listening'
                ? 'bg-red-500'
                : status === 'speaking'
                ? 'bg-blue-400'
                : status === 'thinking'
                ? 'bg-amber-400'
                : 'bg-emerald-300'
            }`}
          />
        </span>
        <Mic className="w-5 h-5" aria-hidden="true" />
        <span className="font-semibold text-sm">
          {status === 'listening'
            ? 'Listening...'
            : status === 'speaking'
            ? 'Speaking...'
            : status === 'thinking'
            ? 'Thinking...'
            : 'Assistant'}
        </span>
      </button>

      {/* Non-modal Assistant Panel (Rule 8: Accessible non-modal region, does not trap focus) */}
      {isOpen && (
        <aside
          ref={panelRef}
          id="assistant-nonmodal-panel"
          role="region"
          aria-label="Assistant"
          className="fixed bottom-24 right-4 sm:right-6 w-[94vw] sm:w-[440px] max-h-[80vh] bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl z-40 flex flex-col overflow-hidden text-slate-100"
        >
          {/* Header */}
          <header className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  status === 'listening'
                    ? 'bg-red-500'
                    : status === 'speaking'
                    ? 'bg-blue-400'
                    : 'bg-emerald-400'
                }`}
                aria-hidden="true"
              />
              <h2 id="assistant-panel-title" className="font-bold text-base text-white">
                Assistant
              </h2>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {mode === 'screen-reader' ? 'Screen reader mode' : 'Voice mode'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Mute button (only active in voice mode) */}
              {mode !== 'screen-reader' && (
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  aria-label={isMuted ? 'Unmute speech output' : 'Mute speech output'}
                  aria-pressed={isMuted}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-red-400" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              )}

              {/* Close button */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                aria-label="Close Assistant panel (Escape)"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* Microphone Permission Pre-explanation or Denied Guide */}
          {micPermissionState === 'explaining' && (
            <div
              role="alert"
              className="p-4 bg-blue-950 border-b border-blue-800 text-blue-100 flex flex-col gap-2 text-sm"
            >
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  Ableway needs access to your microphone so you can speak to the assistant. When your
                  browser asks, please choose <strong>Allow</strong>. You can always use the keyboard
                  instead.
                </p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={async () => {
                    dismissMicExplanation();
                    await requestMicPermission();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs min-h-[44px] flex items-center"
                >
                  Continue to browser prompt
                </button>
                <button
                  type="button"
                  onClick={dismissMicExplanation}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs min-h-[44px] flex items-center"
                >
                  Use keyboard instead
                </button>
              </div>
            </div>
          )}

          {micPermissionState === 'denied' && (
            <div
              role="alert"
              className="p-3 bg-amber-950 border-b border-amber-800 text-amber-200 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <p>
                Microphone access was denied. You can continue with full keyboard support: type into the
                text box below or use Alt+Shift+A at any time.
              </p>
            </div>
          )}

          {/* Action Confirmation Dialog (Rule 1: Native HTML first, Confirmation before submitting/destructive actions) */}
          {pendingAction && (
            <div
              role="alertdialog"
              aria-labelledby="confirm-action-title"
              aria-describedby="confirm-action-desc"
              className="p-4 bg-emerald-950/90 border-b-2 border-emerald-500 text-emerald-100 flex flex-col gap-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 id="confirm-action-title" className="font-bold text-sm text-white">
                    Confirmation Required
                  </h3>
                  <p id="confirm-action-desc" className="text-xs text-emerald-200 mt-1 leading-relaxed">
                    {pendingAction.prompt}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs min-h-[44px] flex items-center gap-1.5 shadow focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>Confirm Action</span>
                </button>
                <button
                  type="button"
                  onClick={cancelAction}
                  aria-label="Cancel action"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs min-h-[44px] flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* Help Escalation Status Banner */}
          {helpStatus && helpStatus !== 'idle' && (
            <div
              role="status"
              className={`p-3 border-b text-xs flex items-center justify-between ${
                helpStatus === 'connected'
                  ? 'bg-blue-950 border-blue-800 text-blue-200'
                  : helpStatus === 'pending'
                  ? 'bg-amber-950 border-amber-800 text-amber-200'
                  : 'bg-red-950 border-red-800 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>
                  {helpStatus === 'connected'
                    ? `Human helper notified (${helpRequestId || 'REQ-1'}). Status: Waiting for helper.`
                    : helpStatus === 'pending'
                    ? 'Connecting to human helper queue...'
                    : 'Helper service unreachable. You can call directly.'}
                </span>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-red-950 border-b border-red-800 text-red-200 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p>{errorMessage}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    className="underline text-red-300 hover:text-white font-semibold"
                  >
                    Use Keyboard
                  </button>
                  <button
                    type="button"
                    onClick={() => callPerson('Failed assistant interaction')}
                    className="underline text-red-300 hover:text-white font-semibold"
                  >
                    Call a Person
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transcript Log (Rule 19: role="log" for dynamic message flow) */}
          <div
            ref={logRef}
            role="log"
            aria-label="Assistant conversation history"
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[340px]"
          >
            {conversation.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'learner'
                    ? 'bg-emerald-800 text-white ml-6 border border-emerald-600'
                    : msg.sender === 'helper'
                    ? 'bg-blue-900 text-white mr-6 border border-blue-500'
                    : msg.sender === 'system'
                    ? 'bg-amber-950 text-amber-200 border border-amber-800'
                    : 'bg-slate-800 text-slate-100 mr-6 border border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs mb-1 opacity-75 uppercase tracking-wider">
                  {msg.sender === 'learner'
                    ? 'You'
                    : msg.sender === 'helper'
                    ? 'Human Helper'
                    : msg.sender === 'system'
                    ? 'System'
                    : 'Assistant'}
                </div>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Control Action Toolbar */}
          <div
            aria-label="Assistant Voice and Help Controls"
            className="p-3 bg-slate-800/90 border-t border-slate-700 flex flex-wrap items-center gap-2 text-xs"
          >
            {/* Speak Push-to-talk button (hold or toggle, also Alt+Shift+S) */}
            <button
              type="button"
              onClick={toggleListening}
              onMouseDown={() => {
                if (micPermissionState !== 'granted') explainMicPermission();
              }}
              className={`px-3 py-2 rounded-xl font-bold flex items-center gap-2 min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              aria-label={
                isListening
                  ? 'Stop listening'
                  : 'Speak push-to-talk button. Press Alt+Shift+S or click to speak.'
              }
              aria-pressed={isListening}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" aria-hidden="true" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" aria-hidden="true" />
                  <span>Speak (Alt+Shift+S)</span>
                </>
              )}
            </button>

            {/* "Stop speaking" button */}
            <button
              type="button"
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              className={`px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                isSpeaking
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              aria-label="Stop speaking. Halts current assistant speech playback."
            >
              <Square className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Stop Speaking</span>
            </button>

            {/* "Repeat" button */}
            <button
              type="button"
              onClick={repeatLastMessage}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold flex items-center gap-1.5 min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              aria-label="Repeat. Repeats the last assistant message."
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Repeat</span>
            </button>

            {/* "Call a person" button (always visible) */}
            <button
              type="button"
              onClick={() => callPerson('User clicked Call a person button')}
              className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors ml-auto focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label="Call a person. Connects you with a human helper."
            >
              <PhoneCall className="w-4 h-4" aria-hidden="true" />
              <span>Call a Person</span>
            </button>
          </div>

          {/* Form Text Input with VISIBLE Label (Rule 15: persistent visible label, never placeholder alone) */}
          <footer className="p-3 bg-slate-800 border-t border-slate-700">
            <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
              <label
                htmlFor="assistant-text-input"
                className="text-xs font-semibold text-slate-300 block"
              >
                Message the assistant (or ask for help):
              </label>

              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  id="assistant-text-input"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask a question, enter course, or answer form..."
                  className="flex-1 bg-slate-950 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  aria-required="true"
                />

                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-colors"
                  aria-label="Send message to assistant"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline text-xs">Send</span>
                </button>
              </div>
            </form>
          </footer>
        </aside>
      )}
    </>
  );
}
