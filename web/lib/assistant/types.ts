import type { Db } from "@/lib/db/types";
import type { Embedder } from "@/lib/knowledge/types";

export type AssistantChannel = "web" | "telegram";

export type HelpRequestType = "payment" | "general" | "technical" | "telegram" | "urgent";

export interface PageContext {
  page?: string;
  allowedActions?: string[];
  [key: string]: unknown;
}

export interface AskAssistantParams {
  channel: AssistantChannel;
  userId?: string | null;
  conversationId?: string | null;
  language?: string;
  text: string;
  pageContext?: PageContext | null;
  /** Test/mock overrides */
  db?: Db;
  embedder?: Embedder;
  fetch?: typeof fetch;
  apiKey?: string;
  model?: string;
}

export interface AssistantActionResult {
  name: string;
  params: Record<string, unknown>;
}

export interface EscalationResult {
  type: HelpRequestType;
  reason: string;
}

export interface AskAssistantResult {
  reply: string;
  actions: AssistantActionResult[];
  escalate?: EscalationResult;
  sources: Array<{
    title: string;
    sourceType: string;
    similarity: number;
  }>;
  /** Internal metadata */
  conversationId?: string;
  confidence?: number;
}
