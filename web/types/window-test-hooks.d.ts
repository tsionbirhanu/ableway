import type { RecognitionLike } from "@/lib/speech/client/recognition";

/** Browser speech APIs that lib.dom does not type yet, and hooks Playwright tests drive. */
declare global {
  interface Window {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
    __simulateVoiceInput?: (text: string) => void;
    __simulatePaymentVoice?: (cmd: string) => void;
  }
}

export {};
