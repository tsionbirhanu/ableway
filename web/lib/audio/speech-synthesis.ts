import { speechPlayer } from "@/lib/speech/client/player";

export interface SpeakOptions {
  /** Use only the browser voice (for fallbacks after server speech already failed). */
  browserOnly?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string;
  lang?: string;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

class SpeechSynthesisManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  /**
   * Speak through our server first (Gemini/Azure: real Amharic voices), with
   * the browser voice as fallback. `browserOnly` skips the server.
   */
  public speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!options.browserOnly) {
      this.stop();
      return speechPlayer
        .speak(text, { lang: options.lang, rate: options.rate, volume: options.volume })
        .then(() => {
          options.onEnd?.();
        });
    }
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        resolve();
        return;
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 0.82;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;
      utterance.lang = options.lang ?? "en-US";

      if (options.voiceURI) {
        const voices = this.getVoices();
        const selected = voices.find((v) => v.voiceURI === options.voiceURI);
        if (selected) utterance.voice = selected;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        options.onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        options.onError?.(e);
        reject(e);
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  public stop(): void {
    speechPlayer.cancel();
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public pause(): void {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public resume(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public isSpeaking(): boolean {
    return speechPlayer.isSpeaking() || !!(this.synth && this.synth.speaking);
  }
}

export const speechSynthesizer = new SpeechSynthesisManager();
