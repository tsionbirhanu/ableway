import { supabase } from '../db/supabase.js';

export interface KnowledgeChunk {
  id: string;
  source: string;
  category: string;
  language: string;
  text: string;
}

// Fallback seed knowledge base for immediate zero-config operation
const DEFAULT_FALLBACK_KNOWLEDGE: KnowledgeChunk[] = [
  {
    id: 'kb-1',
    source: 'platform-guide',
    category: 'platform',
    language: 'en',
    text: 'Ableway is an accessible e-learning platform designed for blind and visually impaired learners. It provides voice-driven registration, course selection, human-assisted payment, interactive audio lessons with text transcripts, and Telegram job alerts.',
  },
  {
    id: 'kb-2',
    source: 'courses-catalog',
    category: 'course',
    language: 'en',
    text: 'Course 1: Introduction to Web Accessibility and Screen Readers. Duration: 4 weeks. Level: Beginner. Price: 500 ETB. Teaches keyboard navigation, NVDA/JAWS shortcuts, and digital literacy. Course 2: Accessible Digital Customer Support. Duration: 6 weeks. Level: Intermediate. Price: 800 ETB. Teaches CRM tools, ticket handling, and audio communication skills for remote employment.',
  },
  {
    id: 'kb-3',
    source: 'payment-guide',
    category: 'payment',
    language: 'en',
    text: 'Payments on Ableway are entirely human-assisted. We never collect or store credit card numbers, passwords, or PINs. When you choose a course and proceed to pay, the assistant connects you directly to a human helper who assists you via Telebirr, CBE Birr, or direct phone guidance.',
  },
  {
    id: 'kb-4',
    source: 'telegram-guide',
    category: 'telegram',
    language: 'en',
    text: 'The Ableway Telegram bot helps you find accessible job opportunities, receive job alerts, forward job announcements to have them summarized aloud, and request human assistance at any time with the /human command.',
  },
];

export async function searchKnowledgeBase(
  query: string,
  language: string = 'en',
  category?: string
): Promise<KnowledgeChunk[]> {
  try {
    // Attempt pgvector match query if Supabase is connected
    let rpcQuery = supabase
      .from('knowledge_chunks')
      .select('id, source, category, language, text')
      .eq('status', 'published')
      .eq('language', language);

    if (category) {
      rpcQuery = rpcQuery.eq('category', category);
    }

    const { data, error } = await rpcQuery.limit(4);

    if (error || !data || data.length === 0) {
      // Fallback keyword search over in-memory verified chunks
      const queryLower = query.toLowerCase();
      const matched = DEFAULT_FALLBACK_KNOWLEDGE.filter((k) =>
        k.text.toLowerCase().includes(queryLower) ||
        queryLower.split(' ').some((word) => word.length > 3 && k.text.toLowerCase().includes(word))
      );

      return matched.length > 0 ? matched : [DEFAULT_FALLBACK_KNOWLEDGE[0]];
    }

    return data;
  } catch (err) {
    console.warn('[RAG] Fallback to verified local knowledge base chunks:', err);
    return DEFAULT_FALLBACK_KNOWLEDGE.slice(0, 3);
  }
}

