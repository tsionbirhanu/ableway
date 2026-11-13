/**
 * Speech player for the browser: asks our server (Gemini or Azure, see
 * lib/speech) to read text aloud, and falls back to the browser's own voice
 * if the server is slow, down, or does not support the language.
 *
 * Most computers and phones have no Amharic voice, so server speech is what
 * makes Amharic audible. The fallback means a learner never gets silence.
 */

export type PlayerSpeakOptions = {
  /** "en", "en-US", "am" or "am-ET". Guessed from the text when missing. */
  lang?: string;
  /** 1 is normal speed. */
  rate?: number;
  /** 0 to 1. */
  volume?: number;
};

/** The server accepts up to 1,500 characters at a time. */
export const MAX_CHUNK_CHARS = 1500;
const SERVER_TIMEOUT_MS = 20_000;
const SERVER_COOLDOWN_MS = 60_000;

/** Ethiopic script means Amharic; anything else is spoken as English. */
export function guessLanguage(text: string): "am" | "en" {
  return /[ሀ-፿]/.test(text) ? "am" : "en";
}

export function toAppLanguage(lang: string | undefined, text: string): "am" | "en" {
  if (!lang) return guessLanguage(text);
  return lang.toLowerCase().startsWith("am") ? "am" : "en";
}

/**
 * Split long text into parts the server accepts, at sentence ends where
 * possible (English . ! ? and Amharic ። ፧ ፨), then at spaces.
 */
export function splitForSpeech(text: string, max = MAX_CHUNK_CHARS): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];

  const sentences = clean.match(/[^.!?።፧፨]+[.!?።፧፨]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  let current = "";
  const pushWords = (sentence: string) => {
    for (const word of sentence.split(" ")) {
      if ((current + " " + word).trim().length > max) {
        if (current.trim()) chunks.push(current.trim());
        current = word.length > max ? word.slice(0, max) : word;
      } else {
        current = (current + " " + word).trim();
      }
    }
  };
  for (const sentence of sentences) {
    if ((current + sentence).length <= max) {
      current += sentence;
    } else if (sentence.length <= max) {
      if (current.trim()) chunks.push(current.trim());
      current = sentence;
    } else {
      pushWords(sentence);
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

type Fetch = typeof fetch;

export class SpeechPlayer {
  private generation = 0;
  private audio: HTMLAudioElement | null = null;
  private serverDownUntil = 0;
  private playing = false;

  constructor(
    private readonly doFetch: Fetch = (...args) => fetch(...args),
    private readonly now: () => number = () => Date.now(),
  ) {}

  isSpeaking(): boolean {
    return this.playing;
  }

  /** Stop speaking now. Any speak() in progress resolves. */
  cancel(): void {
    this.generation++;
    this.playing = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  }

  /**
   * Speak text and resolve when it has finished (or was cancelled, or failed).
   * Resolves true when it played to the end, false when cancelled.
   * Never rejects, so callers can always continue (for example, start listening).
   */
  async speak(text: string, options: PlayerSpeakOptions = {}): Promise<boolean> {
    this.cancel();
    const generation = this.generation;
    const chunks = splitForSpeech(text);
    if (chunks.length === 0) return true;
    const language = toAppLanguage(options.lang, text);
    this.playing = true;

    try {
      // Fetch the next part while the current one plays.
      let next: Promise<Blob | null> = this.fetchAudio(chunks[0]!, language, options.rate);
      for (let i = 0; i < chunks.length; i++) {
        const blob = await next;
        if (generation !== this.generation) return false;
        if (i + 1 < chunks.length) next = this.fetchAudio(chunks[i + 1]!, language, options.rate);
        const played = blob ? await this.playBlob(blob, options.volume, generation) : false;
        if (generation !== this.generation) return false;
        if (!played) await this.browserSpeak(chunks[i]!, language, options);
        if (generation !== this.generation) return false;
      }
      return true;
    } finally {
      if (generation === this.generation) this.playing = false;
    }
  }

  private async fetchAudio(text: string, language: string, rate = 1): Promise<Blob | null> {
    if (this.now() < this.serverDownUntil) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);
    try {
      const res = await this.doFetch("/api/speech/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, rate: Math.min(2, Math.max(0.5, rate)) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.headers.get("content-type")?.startsWith("audio/")) {
        // 503: provider down. Use the browser voice for a while instead of waiting each time.
        if (res.status >= 500) this.serverDownUntil = this.now() + SERVER_COOLDOWN_MS;
        return null;
      }
      // The mock provider (no speech key set) makes silent audio: use the browser voice.
      if (res.headers.get("x-speech-provider") === "mock") return null;
      return await res.blob();
    } catch {
      this.serverDownUntil = this.now() + SERVER_COOLDOWN_MS;
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private playBlob(blob: Blob, volume: number | undefined, generation: number): Promise<boolean> {
    if (typeof Audio === "undefined" || typeof URL.createObjectURL !== "function") {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      if (volume !== undefined) audio.volume = Math.min(1, Math.max(0, volume));
      this.audio = audio;
      const finish = (ok: boolean) => {
        URL.revokeObjectURL(url);
        if (this.audio === audio) this.audio = null;
        resolve(ok);
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(generation !== this.generation);
      // Autoplay blocked or decode error: fall back to the browser voice.
      audio.play().catch(() => finish(generation !== this.generation));
    });
  }

  private browserSpeak(text: string, language: string, options: PlayerSpeakOptions): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "am" ? "am-ET" : "en-US";
      utterance.rate = options.rate ?? 1;
      if (options.volume !== undefined) utterance.volume = options.volume;
      // Chromium sometimes never fires onend; this timer makes sure we continue.
      const words = text.split(/\s+/).length;
      const timer = setTimeout(
        resolve,
        Math.max(4000, (words / (2.3 * (options.rate ?? 1))) * 1000 + 3000),
      );
      utterance.onend = () => {
        clearTimeout(timer);
        resolve();
      };
      utterance.onerror = () => {
        clearTimeout(timer);
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }
}

/** One player for the whole app, so two pages never talk over each other. */
export const speechPlayer = new SpeechPlayer();
