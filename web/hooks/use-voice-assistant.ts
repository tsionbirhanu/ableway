"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { speechRecognizer } from "@/core/audio/speech-recognition";
import { parseVoiceCommand } from "@/core/audio/voice-commands";
import { useA11y } from "@/core/a11y/a11y-context";
import { useEarcons } from "./use-earcons";
import { VoiceCommandIntent, VoiceState } from "@/types/voice";

export function useVoiceAssistant() {
  const router = useRouter();
  const { speak, stopSpeaking, increaseSpeechRate, decreaseSpeechRate } = useA11y();
  const { play } = useEarcons();

  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    transcript: "",
    lastCommand: null,
    confidence: 1.0,
    error: null,
  });

  const lastCommandRef = useRef<VoiceCommandIntent | null>(null);

  const executeCommand = useCallback(
    async (intent: VoiceCommandIntent) => {
      lastCommandRef.current = intent;
      setState((prev) => ({ ...prev, lastCommand: intent }));

      switch (intent) {
        case "HELP":
          play("command-recognized");
          await speak(
            "Available commands: Home, Go Back, Next Lesson, Previous Lesson, Ask Tutor, Find Jobs, Slower, Faster, or Stop."
          );
          break;

        case "WHERE_AM_I":
          play("command-recognized");
          await speak(`You are on the Ableway platform at ${window.location.pathname}`);
          break;

        case "GO_HOME":
          play("navigation");
          await speak("Navigating to dashboard");
          router.push("/dashboard");
          break;

        case "GO_BACK":
          play("navigation");
          await speak("Going back");
          router.back();
          break;

        case "SLOWER":
          decreaseSpeechRate();
          play("success");
          await speak("Speech rate decreased");
          break;

        case "FASTER":
          increaseSpeechRate();
          play("success");
          await speak("Speech rate increased");
          break;

        case "ASK_TUTOR":
          play("navigation");
          await speak("Opening AI Tutor");
          router.push("/tutor");
          break;

        case "FIND_JOBS":
          play("navigation");
          await speak("Opening Jobs Portal");
          router.push("/jobs");
          break;

        case "GIVE_FEEDBACK":
          play("navigation");
          await speak("Opening Feedback");
          router.push("/feedback");
          break;

        case "STOP":
          play("listening-stop");
          stopSpeaking();
          speechRecognizer.stop();
          break;

        case "UNKNOWN":
        default:
          // Unrecognized command
          play("error");
          await speak("Sorry, I did not catch that command. Say 'Help' to hear available options.");
          break;
      }
    },
    [router, speak, stopSpeaking, increaseSpeechRate, decreaseSpeechRate, play]
  );

  const startListening = useCallback(() => {
    play("listening-start");
    setState((prev) => ({ ...prev, isListening: true, error: null, transcript: "" }));

    speechRecognizer.start({
      onStart: () => {
        setState((prev) => ({ ...prev, isListening: true }));
      },
      onResult: (text: string, isFinal: boolean) => {
        setState((prev) => ({ ...prev, transcript: text }));
        if (isFinal && text.trim().length > 0) {
          const { intent } = parseVoiceCommand(text);
          executeCommand(intent);
        }
      },
      onError: (err: string) => {
        play("error");
        setState((prev) => ({ ...prev, isListening: false, error: err }));
      },
      onEnd: () => {
        setState((prev) => ({ ...prev, isListening: false }));
      },
    });
  }, [play, executeCommand]);

  const stopListening = useCallback(() => {
    play("listening-stop");
    speechRecognizer.stop();
    setState((prev) => ({ ...prev, isListening: false }));
  }, [play]);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      speechRecognizer.stop();
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    executeCommand,
  };
}

