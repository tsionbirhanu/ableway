import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import type { Embedder } from "./types";

const GEMINI_EMBEDDING_API =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004";
export const GEMINI_EMBEDDING_MODEL = "models/text-embedding-004";

/**
 * Real Gemini Embedder: embeds text into 768 dimensions using text-embedding-004.
 */
export class GeminiEmbedder implements Embedder {
  readonly dimensions = EMBEDDING_DIMENSIONS;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options?: { apiKey?: string; timeoutMs?: number; fetch?: typeof fetch }) {
    this.apiKey = options?.apiKey ?? getEnv().GEMINI_API_KEY ?? "";
    this.timeoutMs = options?.timeoutMs ?? 20_000;
    this.fetchFn = options?.fetch ?? fetch;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0] ?? new Array(this.dimensions).fill(0);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (!this.apiKey) {
      throw new Error("GeminiEmbedder: GEMINI_API_KEY is missing or empty.");
    }

    const BATCH_SIZE = 50;
    const allResults: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const slice = texts.slice(i, i + BATCH_SIZE);
      const requests = slice.map((t) => ({
        model: GEMINI_EMBEDDING_MODEL,
        content: { parts: [{ text: t }] },
        outputDimensionality: this.dimensions,
      }));

      const url = `${GEMINI_EMBEDDING_API}:batchEmbedContents`;
      const res = await this.fetchFn(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(
          `Gemini embed error: ${res.status} ${res.statusText} ${errorText.slice(0, 200)}`,
        );
      }

      const data = (await res.json()) as { embeddings?: Array<{ values?: number[] }> };
      const batchEmbeddings = data.embeddings?.map((e) => e.values ?? []) ?? [];

      if (batchEmbeddings.length !== slice.length) {
        throw new Error(
          `Gemini batchEmbedContents returned ${batchEmbeddings.length} embeddings for ${slice.length} inputs.`,
        );
      }

      for (const emb of batchEmbeddings) {
        allResults.push(emb);
      }
    }

    return allResults;
  }
}

const STOPWORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "get",
  "has",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "this",
  "to",
  "was",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "will",
  "with",
  "you",
  "your",
]);

/**
 * Deterministic semantic-like embedder for tests.
 * Uses subword n-grams and stemming so related texts (e.g. "payment" and "pay",
 * "telebirr") yield high cosine similarity (>0.7), and off-topic questions
 * yield near-zero similarity.
 */
export class FakeEmbedder implements Embedder {
  readonly dimensions = EMBEDDING_DIMENSIONS;

  private fnv1a(str: string, seed = 0x811c9dc5): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  private stem(w: string): string {
    let s = w.replace(/(ing|tion|tions|ment|ments|ed|es|s)$/i, "").replace(/(er|ers|or|ors)$/i, "");
    // Amharic common prefixes: በ (with/in), የ (of), ለ (for), ከ (from)
    if (/^[በየለከ][\u1200-\u137F]{2,}/.test(s)) {
      s = s.slice(1);
    }
    return s;
  }

  async embed(text: string): Promise<number[]> {
    const vec = new Float64Array(this.dimensions);
    const rawTokens = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);

    // Filter stopwords, but keep if text consists only of stopwords
    let tokens = rawTokens.filter((w) => !STOPWORDS.has(w) && w.length > 1);
    if (tokens.length === 0) {
      tokens = rawTokens.filter((w) => w.length > 0);
    }

    if (tokens.length === 0) {
      vec[0] = 1;
      return Array.from(vec);
    }

    for (const token of tokens) {
      const stemmed = this.stem(token);
      const subwords = new Set<string>();

      subwords.add(token);
      if (stemmed.length >= 2) subwords.add(stemmed);

      // Add 2-grams, 3-grams and 4-grams for subword matching
      for (let len = 2; len <= 4; len++) {
        for (let i = 0; i <= token.length - len; i++) {
          subwords.add(token.slice(i, i + len));
        }
      }

      for (const sw of subwords) {
        const h = this.fnv1a(sw);
        const weight = sw === stemmed || sw === token ? 6.0 : 0.8;
        // Project onto 8 dimensions per subword
        for (let f = 0; f < 8; f++) {
          const dimHash = this.fnv1a(`${sw}:${f}`, h);
          const dim = dimHash % this.dimensions;
          const sign = (dimHash & 0x1000) === 0 ? 1 : -1;
          vec[dim] += sign * weight;
        }
      }
    }

    // L2 normalize
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vec[i] /= norm;
      }
    } else {
      vec[0] = 1;
    }

    return Array.from(vec);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}

/**
 * Returns a default embedder: GeminiEmbedder in production/when key is available,
 * or FakeEmbedder when GEMINI_API_KEY is not set or in test environments.
 */
export function getEmbedder(): Embedder {
  const env = process.env;
  if (env.GEMINI_API_KEY && env.NODE_ENV !== "test") {
    return new GeminiEmbedder({ apiKey: env.GEMINI_API_KEY });
  }
  return new FakeEmbedder();
}
