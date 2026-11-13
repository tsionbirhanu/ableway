import { createHash } from "node:crypto";
import type { SynthesizedAudio } from "./types";

/**
 * Cache for synthesized speech. The assistant says the same phrases often
 * ("You are on the courses page"), so we keep recent audio in memory.
 *
 * The key is a hash of provider, text, language, voice and rate; the text
 * itself is not kept as a key. Size-limited, least recently used first out.
 *
 * Per server instance. TODO: move to shared storage (Postgres or blob
 * storage) if many instances run and the hit rate is low.
 */

export function ttsCacheKey(parts: {
  provider: string;
  text: string;
  language: string;
  voice: string;
  rate: number;
}): string {
  return createHash("sha256")
    .update(JSON.stringify([parts.provider, parts.text, parts.language, parts.voice, parts.rate]))
    .digest("hex");
}

export class TtsCache {
  private readonly entries = new Map<string, SynthesizedAudio>();
  private bytes = 0;

  constructor(
    private readonly maxEntries = 500,
    private readonly maxBytes = 50 * 1024 * 1024,
  ) {}

  get(key: string): SynthesizedAudio | undefined {
    const hit = this.entries.get(key);
    if (hit) {
      // Mark as recently used.
      this.entries.delete(key);
      this.entries.set(key, hit);
    }
    return hit;
  }

  set(key: string, value: SynthesizedAudio): void {
    if (value.audio.length > this.maxBytes) return;
    const existing = this.entries.get(key);
    if (existing) {
      this.bytes -= existing.audio.length;
      this.entries.delete(key);
    }
    this.entries.set(key, value);
    this.bytes += value.audio.length;
    while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.bytes -= this.entries.get(oldest)!.audio.length;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  get totalBytes(): number {
    return this.bytes;
  }
}
