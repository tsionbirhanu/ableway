"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useA11y } from "@/lib/a11y/a11y-context";
import { playEarcon } from "@/lib/audio/earcons";
import { speechSynthesizer } from "@/lib/audio/speech-synthesis";

export type AssistantStatus = "idle" | "listening" | "thinking" | "speaking";
export type InteractionModeType = "voice" | "screen-reader" | "hybrid";
export type MicPermissionState = "prompt" | "explaining" | "granted" | "denied";

export interface AssistantMessage {
  id: string;
  sender: "learner" | "assistant" | "helper" | "system";
  text: string;
  timestamp: number;
}

export interface ActionDefinition {
  name: string;
  description: string;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string | ((params: Record<string, unknown>) => string);
  announcement?: string | ((params: Record<string, unknown>) => string);
  handler: (params: Record<string, unknown>) => Promise<void> | void;
}

export interface PendingAction {
  action: ActionDefinition;
  params: Record<string, unknown>;
  prompt: string;
}

export interface AssistantContextType {
  // Conversation and State
  conversation: AssistantMessage[];
  status: AssistantStatus;
  mode: InteractionModeType;
  isOpen: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  pendingAction: PendingAction | null;
  helpStatus: "idle" | "pending" | "connected" | "error" | null;
  helpRequestId: string | null;
  errorMessage: string | null;
  micPermissionState: MicPermissionState;

  // Panel Control
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setIsMuted: (muted: boolean) => void;

  // Action Registry
  registerAction: (action: ActionDefinition) => void;
  unregisterAction: (name: string) => void;
  registeredActions: Record<string, ActionDefinition>;

  // Interaction Methods
  sendMessage: (text: string) => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  stopSpeaking: () => void;
  repeatLastMessage: () => void;
  callPerson: (reason?: string) => Promise<void>;

  // Confirmation Flow
  confirmAction: () => Promise<void>;
  cancelAction: () => void;

  // Mode control
  setMode: (mode: InteractionModeType) => void;

  // Permission Flow
  requestMicPermission: () => Promise<boolean>;
  explainMicPermission: () => void;
  dismissMicExplanation: () => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export function AssistantProvider({
  initialMode,
  children,
}: {
  initialMode?: InteractionModeType;
  children: React.ReactNode;
}) {
  const [pathname, setPathname] = useState("/");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);
  const router = useRouter();
  const { mode: a11yMode, speechRate, announce } = useA11y();

  const [explicitMode, setExplicitMode] = useState<InteractionModeType | null>(initialMode ?? null);

  // Mode normalized to 'voice' | 'screen-reader' | 'hybrid'
  const mode: InteractionModeType =
    explicitMode ??
    (a11yMode === "screen-reader" ? "screen-reader" : a11yMode === "hybrid" ? "hybrid" : "voice");

  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [helpStatus, setHelpStatus] = useState<"idle" | "pending" | "connected" | "error" | null>(null);
  const [helpRequestId, setHelpRequestId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [micPermissionState, setMicPermissionState] = useState<MicPermissionState>("prompt");

  const [conversation, setConversation] = useState<AssistantMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Hello! I am your Ableway Assistant. Press Alt+Shift+S to speak or Alt+Shift+A to open this panel. Say 'Help' for options or 'Call a person' for live support.",
      timestamp: 0,
    },
  ]);

  // Registry for page actions
  const registeredActionsRef = useRef<Record<string, ActionDefinition>>({});
  const [, setRegistryVersion] = useState(0);

  // Audio & Recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioElemRef = useRef<HTMLAudioElement | null>(null);

  // Default global actions
  useEffect(() => {
    // Register standard goToPage and fillField actions
    registeredActionsRef.current["goToPage"] = {
      name: "goToPage",
      description: "Navigate to a page",
      requiresConfirmation: false,
      announcement: (p) => `Navigating to ${p.path || "page"}`,
      handler: (p) => {
        if (typeof p.path === "string") router.push(p.path);
      },
    };

    registeredActionsRef.current["fillField"] = {
      name: "fillField",
      description: "Fill a form input field",
      requiresConfirmation: false,
      announcement: (p) => `Filling in your ${p.field || "field"}`,
      handler: (p) => {
        if (typeof window === "undefined") return;
        const fieldName = String(p.field || "");
        const fieldValue = String(p.value ?? "");
        const input = (document.querySelector(`[name="${fieldName}"]`) ||
          document.getElementById(fieldName)) as HTMLInputElement | null;
        if (input) {
          input.value = fieldValue;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
    };
  }, [router]);

  const registerAction = useCallback((action: ActionDefinition) => {
    registeredActionsRef.current[action.name] = action;
    setRegistryVersion((v) => v + 1);
  }, []);

  const unregisterAction = useCallback((name: string) => {
    delete registeredActionsRef.current[name];
    setRegistryVersion((v) => v + 1);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined") {
      if (currentAudioElemRef.current) {
        currentAudioElemRef.current.pause();
        currentAudioElemRef.current = null;
      }
      speechSynthesizer.stop();
    }
    if (status === "speaking") {
      setStatus("idle");
    }
  }, [status]);

  // Voice output obeying Rule 20: Screen reader mode NEVER speaks!
  const speakText = useCallback(
    async (text: string): Promise<void> => {
      // Rule 20: Screen reader mode NEVER speaks. Live region handles announcement.
      if (mode === "screen-reader" || isMuted || typeof window === "undefined") {
        return;
      }

      stopSpeaking();
      setStatus("speaking");

      try {
        // Try server synthesize endpoint
        const res = await fetch("/api/speech/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, rate: speechRate }),
        });

        if (res.ok && res.headers.get("content-type")?.includes("audio/")) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          currentAudioElemRef.current = audio;

          await new Promise<void>((resolve) => {
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              currentAudioElemRef.current = null;
              playEarcon("done");
              setStatus("idle");
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              currentAudioElemRef.current = null;
              // Fallback to browser SpeechSynthesis
              speechSynthesizer
                .speak(text, { rate: speechRate })
                .then(() => {
                  playEarcon("done");
                  setStatus("idle");
                  resolve();
                })
                .catch(() => {
                  setStatus("idle");
                  resolve();
                });
            };
            audio.play().catch(() => {
              // User gesture restriction, fallback to SpeechSynthesis
              speechSynthesizer
                .speak(text, { rate: speechRate })
                .then(() => {
                  playEarcon("done");
                  setStatus("idle");
                  resolve();
                })
                .catch(() => {
                  setStatus("idle");
                  resolve();
                });
            });
          });
        } else {
          // Fallback to client SpeechSynthesis
          await speechSynthesizer.speak(text, { rate: speechRate });
          playEarcon("done");
          setStatus("idle");
        }
      } catch {
        // Fallback to client SpeechSynthesis
        await speechSynthesizer.speak(text, { rate: speechRate });
        playEarcon("done");
        setStatus("idle");
      }
    },
    [mode, isMuted, speechRate, stopSpeaking]
  );

  // Escalate to human helper
  const callPerson = useCallback(
    async (reason?: string) => {
      const why = reason || "Learner requested a human helper";
      setHelpStatus("pending");
      announce("Connecting you with a human helper. Please wait.");

      if (mode !== "screen-reader") {
        await speakText("Connecting you with a human helper now.");
      }

      try {
        const res = await fetch("/api/help", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: why, channel: "web", page: pathname }),
        });

        if (res.ok) {
          const data = await res.json();
          setHelpRequestId(data.id || "REQ-1");
          setHelpStatus("connected");
          const msg: AssistantMessage = {
            id: `escalate-${Date.now()}`,
            sender: "helper",
            text: `A human helper has received your request (${data.id || "REQ-1"}). Status: Waiting for helper.`,
            timestamp: Date.now(),
          };
          setConversation((prev) => [...prev, msg]);
          announce("A human helper has received your request and will assist you shortly.");
        } else {
          setHelpStatus("error");
          announce("Could not connect to helper service. You can call directly or retry.");
        }
      } catch {
        setHelpStatus("error");
        announce("Network error while connecting to helper service.");
      }
    },
    [announce, mode, pathname, speakText]
  );

  // Execute confirmed action
  const confirmAction = useCallback(async () => {
    if (!pendingAction) return;
    const { action, params } = pendingAction;
    setPendingAction(null);

    const announcementText =
      typeof action.announcement === "function"
        ? action.announcement(params)
        : action.announcement || `Executing ${action.description}`;

    announce(announcementText);
    try {
      await action.handler(params);
      playEarcon("done");
    } catch {
      playEarcon("error");
      announce(`Failed to complete action: ${action.name}`);
    }
  }, [pendingAction, announce]);

  const cancelAction = useCallback(() => {
    if (!pendingAction) return;
    setPendingAction(null);
    announce("Action cancelled.");
  }, [pendingAction, announce]);

  // Execute actions returned by assistant API
  const executeActions = useCallback(
    async (actions: Array<{ name: string; params: Record<string, unknown> }>) => {
      for (const actionItem of actions) {
        const actionDef = registeredActionsRef.current[actionItem.name];
        if (!actionDef) {
          announce(`Action ${actionItem.name} is not available on this page.`);
          continue;
        }

        // Action confirmation check: requires confirmation if irreversible or submits data
        if (actionDef.requiresConfirmation) {
          const prompt =
            typeof actionDef.confirmationPrompt === "function"
              ? actionDef.confirmationPrompt(actionItem.params)
              : actionDef.confirmationPrompt ||
                `Are you sure you want to proceed with this action? This will submit data.`;

          setPendingAction({ action: actionDef, params: actionItem.params, prompt });
          announce(`Confirmation needed: ${prompt}`);
          if (mode !== "screen-reader") {
            speakText(`Confirmation needed: ${prompt}`);
          }
          return; // Wait for user confirmation
        }

        // Announce and execute safe action
        const announcementText =
          typeof actionDef.announcement === "function"
            ? actionDef.announcement(actionItem.params)
            : actionDef.announcement || `Executing ${actionDef.description}`;

        announce(announcementText);
        try {
          await actionDef.handler(actionItem.params);
          playEarcon("done");
        } catch {
          playEarcon("error");
          announce(`Failed to complete action: ${actionDef.name}`);
        }
      }
    },
    [announce, mode, speakText]
  );

  // Send text message to /api/assistant
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setErrorMessage(null);

      // Add user message to conversation log
      const userMsg: AssistantMessage = {
        id: `user-${Date.now()}`,
        sender: "learner",
        text,
        timestamp: Date.now(),
      };
      setConversation((prev) => [...prev, userMsg]);
      setStatus("thinking");

      // Check for local single-word commands
      const lower = text.toLowerCase().trim();
      if (lower === "stop") {
        stopSpeaking();
        setStatus("idle");
        announce("Speech stopped.");
        return;
      }
      if (lower === "repeat") {
        repeatLastMessage();
        setStatus("idle");
        return;
      }
      if (lower === "call a person" || lower === "call human") {
        setStatus("idle");
        await callPerson();
        return;
      }

      try {
        const registeredNames = Object.keys(registeredActionsRef.current);
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            currentPage: pathname,
            registeredActions: registeredNames,
          }),
        });

        if (!res.ok) {
          throw new Error("Assistant service error");
        }

        const data = await res.json();
        const replyText = data.reply || "I received your message.";
        const spokenText = data.spokenReply || replyText;

        const assistantMsg: AssistantMessage = {
          id: `asst-${Date.now()}`,
          sender: "assistant",
          text: replyText,
          timestamp: Date.now(),
        };
        setConversation((prev) => [...prev, assistantMsg]);

        // Rule 20: Dual Modes. Voice speaks; Screen reader writes to live region.
        if (mode === "screen-reader") {
          announce(replyText, "polite");
          setStatus("idle");
        } else {
          await speakText(spokenText);
        }

        // Handle escalation if flag returned
        if (data.escalate) {
          await callPerson(data.escalateReason || "Assistant escalated request to human");
        }

        // Execute returned actions
        if (data.actions && data.actions.length > 0) {
          await executeActions(data.actions);
        }
      } catch (_err) {
        setStatus("idle");
        playEarcon("error");
        const failureMsg =
          "The assistant service is temporarily unavailable. You can type using your keyboard in the text box below, or select 'Call a person' for live support.";
        setErrorMessage(failureMsg);
        announce(failureMsg, "assertive");
        if (mode !== "screen-reader") {
          speakText(failureMsg);
        }
      }
    },
    [pathname, stopSpeaking, announce, mode, speakText, callPerson, executeActions]
  );

  // Repeat last message
  const repeatLastMessage = useCallback(() => {
    const assistantMessages = conversation.filter((m) => m.sender === "assistant" || m.sender === "helper");
    const last = assistantMessages[assistantMessages.length - 1];
    if (last) {
      if (mode === "screen-reader") {
        announce(`Repeating: ${last.text}`, "polite");
      } else {
        speakText(last.text);
      }
    } else {
      announce("No previous message to repeat.", "polite");
    }
  }, [conversation, mode, announce, speakText]);

  // Request mic permission
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicPermissionState("denied");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop preview tracks immediately
      stream.getTracks().forEach((t) => t.stop());
      setMicPermissionState("granted");
      return true;
    } catch {
      setMicPermissionState("denied");
      announce(
        "Microphone access was denied. You can continue using your keyboard to type messages below.",
        "assertive"
      );
      return false;
    }
  }, [announce]);

  const explainMicPermission = useCallback(() => {
    setMicPermissionState("explaining");
  }, []);

  const dismissMicExplanation = useCallback(() => {
    setMicPermissionState("prompt");
  }, []);

  // MediaRecorder Voice Flow
  const startListening = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Check permission state first
    if (micPermissionState !== "granted") {
      const granted = await requestMicPermission();
      if (!granted) return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setStatus("listening");
        playEarcon("listening started");
        announce("Listening for your command or question.", "polite");
      };

      mediaRecorder.onstop = async () => {
        setStatus("thinking");
        playEarcon("stop");
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Send to /api/speech/transcribe
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const transcribeRes = await fetch("/api/speech/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!transcribeRes.ok) {
            throw new Error("Transcription service error");
          }

          const { transcript, confidence } = await transcribeRes.json();

          // Low-confidence check: ask learner to repeat or spell; never act on it!
          if (!transcript || confidence < 0.65) {
            playEarcon("error");
            setStatus("idle");
            const repeatPrompt =
              "I didn't quite catch that. Could you please repeat or spell that out?";
            const msg: AssistantMessage = {
              id: `low-conf-${Date.now()}`,
              sender: "assistant",
              text: repeatPrompt,
              timestamp: Date.now(),
            };
            setConversation((prev) => [...prev, msg]);

            if (mode === "screen-reader") {
              announce(repeatPrompt, "polite");
            } else {
              speakText(repeatPrompt);
            }
            return;
          }

          // High confidence: play understood earcon and proceed
          playEarcon("understood");
          await sendMessage(transcript);
        } catch (_err) {
          setStatus("idle");
          playEarcon("error");
          const errorPrompt =
            "The speech recognition service is temporarily unavailable. You can use the keyboard to type your message below, or select 'Call a person'.";
          setErrorMessage(errorPrompt);
          announce(errorPrompt, "assertive");
          if (mode !== "screen-reader") {
            speakText(errorPrompt);
          }
        }
      };

      mediaRecorder.start();
    } catch {
      setStatus("idle");
      setMicPermissionState("denied");
      playEarcon("error");
      announce(
        "Could not access your microphone. You can type using your keyboard in the text box below.",
        "assertive"
      );
    }
  }, [micPermissionState, requestMicPermission, announce, mode, speakText, sendMessage]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (status === "listening") {
      stopListening();
    } else {
      startListening();
    }
  }, [status, stopListening, startListening]);

  // Global Keyboard Shortcuts: Alt+Shift+A (toggle panel), Alt+Shift+S (push-to-talk)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.altKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setIsOpen(true);
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);

  return (
    <AssistantContext.Provider
      value={{
        conversation,
        status,
        mode,
        isOpen,
        isListening: status === "listening",
        isSpeaking: status === "speaking",
        isMuted,
        pendingAction,
        helpStatus,
        helpRequestId,
        errorMessage,
        micPermissionState,
        setIsOpen,
        toggleOpen,
        setIsMuted,
        registerAction,
        unregisterAction,
        registeredActions: registeredActionsRef.current,
        sendMessage,
        startListening,
        stopListening,
        toggleListening,
        stopSpeaking,
        repeatLastMessage,
        callPerson,
        confirmAction,
        cancelAction,
        setMode: setExplicitMode,
        requestMicPermission,
        explainMicPermission,
        dismissMicExplanation,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
}

