export interface STTOptions {
  language?: string;
  sampleRate?: number;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  language?: string;
}

export interface ISpeechService {
  transcribeAudio(audioBuffer: Buffer, options?: STTOptions): Promise<string>;
  synthesizeSpeech(text: string, options?: TTSOptions): Promise<Buffer | null>;
}

