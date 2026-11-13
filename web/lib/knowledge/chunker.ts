/**
 * Chunker for the knowledge base.
 *
 * Requirement: split text into chunks of about 300 to 500 words
 * with a small overlap.
 */

export interface ChunkOptions {
  /** Target word count per chunk. Defaults to 350 words. */
  targetWords?: number;
  /** Maximum words per chunk. Defaults to 500 words. */
  maxWords?: number;
  /** Overlap in words between consecutive chunks. Defaults to 50 words. */
  overlapWords?: number;
}

export function splitIntoChunks(text: string, options: ChunkOptions = {}): string[] {
  const clean = text.trim();
  if (!clean) return [];

  const targetWords = options.targetWords ?? 350;
  const maxWords = options.maxWords ?? 500;
  const overlapWords = options.overlapWords ?? 50;

  const words = clean.split(/\s+/).filter(Boolean);

  // If the total text fits comfortably within maxWords, keep as a single chunk.
  if (words.length <= maxWords) {
    return [words.join(" ")];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + targetWords, words.length);
    const chunkWords = words.slice(startIndex, endIndex);

    chunks.push(chunkWords.join(" "));

    if (endIndex >= words.length) {
      break;
    }

    // Advance by (targetWords - overlapWords), ensuring forward progress
    const step = Math.max(1, targetWords - overlapWords);
    startIndex += step;
  }

  return chunks;
}

