export interface RecognitionCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface WebkitSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
}

export class SpeechRecognitionManager {
  private recognition: WebkitSpeechRecognitionInstance | null = null;
  private isListening: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: new () => WebkitSpeechRecognitionInstance })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => WebkitSpeechRecognitionInstance })
          .webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public start(callbacks: RecognitionCallbacks, lang: string = "en-US"): boolean {
    if (!this.recognition) {
      callbacks.onError("Speech recognition is not supported in this browser.");
      return false;
    }

    if (this.isListening) {
      this.stop();
    }

    this.recognition.lang = lang;

    this.recognition.onstart = () => {
      this.isListening = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: unknown) => {
      const speechEvent = event as {
        resultIndex: number;
        results: {
          length: number;
          [index: number]: {
            isFinal: boolean;
            [index: number]: { transcript: string; confidence: number };
          };
        };
      };

      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = speechEvent.resultIndex; i < speechEvent.results.length; ++i) {
        if (speechEvent.results[i].isFinal) {
          finalTranscript += speechEvent.results[i][0].transcript;
        } else {
          interimTranscript += speechEvent.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      callbacks.onResult(text.trim(), !!finalTranscript);
    };

    this.recognition.onerror = (event: unknown) => {
      const errEvent = event as { error?: string };
      this.isListening = false;
      callbacks.onError(errEvent.error || "Speech recognition error");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      callbacks.onError(e instanceof Error ? e.message : "Failed to start recognition");
      return false;
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore already stopped error
      }
      this.isListening = false;
    }
  }

  public abort(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.isListening = false;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

export const speechRecognizer = new SpeechRecognitionManager();

