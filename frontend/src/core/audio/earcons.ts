import { EarconType } from "@/types/voice";

class EarconManager {
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = true;

  constructor() {
    // Lazy initialized on first user interaction in browser
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public play(type: EarconType) {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case "listening-start":
          // Ascending two-tone chime (440Hz -> 880Hz)
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.18);
          break;

        case "listening-stop":
          // Descending soft chime (660Hz -> 330Hz)
          osc.type = "sine";
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.exponentialRampToValueAtTime(330, now + 0.12);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;

        case "command-recognized":
        case "success":
          // Bright positive chord (523.25Hz -> 659.25Hz -> 783.99Hz)
          osc.type = "triangle";
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.08);
          osc.frequency.setValueAtTime(783.99, now + 0.16);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
          osc.start(now);
          osc.stop(now + 0.28);
          break;

        case "error":
          // Low alert tone (220Hz -> 180Hz)
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.setValueAtTime(180, now + 0.1);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.22);
          break;

        case "warning":
          osc.type = "sine";
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.setValueAtTime(350, now + 0.08);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;

        case "navigation":
          // Quick subtle tick
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
      }
    } catch {
      // AudioContext could be blocked until user gesture
    }
  }
}

export const earcons = new EarconManager();

