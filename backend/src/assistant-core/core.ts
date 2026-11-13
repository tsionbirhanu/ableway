import { AssistantRequest, AssistantResponse } from './types.js';
import { sanitizeAndCheckSafety } from './safety.js';
import { searchKnowledgeBase } from './rag.js';
import { buildSystemPrompt } from './prompts.js';
import { validateAction } from './actions.js';

export async function processAssistantMessage(request: AssistantRequest): Promise<AssistantResponse> {
  const { message, channel, language, currentPage, misunderstandingCount = 0 } = request;

  // 1. Safety & Distress Evaluation (FR-10.2 & NFR-4.4)
  const safety = sanitizeAndCheckSafety(message);

  if (safety.isDistressed || misunderstandingCount >= 3) {
    return {
      reply: 'I understand this can feel overwhelming. I am connecting you to a human helper right now who will assist you directly.',
      spokenReply: 'I am connecting you to a human helper right now.',
      actions: [
        {
          name: 'request_human',
          params: { reason: safety.escalationReason || 'Repeated misunderstandings or distress', type: 'urgent' },
        },
      ],
      escalateToHuman: true,
      escalationReason: safety.escalationReason || 'Distress or 3+ repeated misunderstandings',
      escalationType: 'urgent',
      language,
    };
  }

  if (!safety.isSafe) {
    return {
      reply: 'I can only assist with Ableway courses, registration, accessible learning, and verified job postings.',
      actions: [],
      escalateToHuman: false,
      language,
    };
  }

  // 2. Direct Voice Form-Filling Intent Recognition (Registration flow FR-2.1, FR-2.2)
  const lowerMsg = message.toLowerCase();

  // Explicit Human Request Trigger (FR-10.1, FR-4.2)
  if (lowerMsg.includes('human') || lowerMsg.includes('agent') || lowerMsg.includes('help me') || lowerMsg.includes('call staff')) {
    return {
      reply: 'I am alerting a human helper for you right away. A team member will assist you shortly.',
      spokenReply: 'I am calling a human helper for you right now.',
      actions: [
        {
          name: 'request_human',
          params: { reason: 'Learner requested a human helper', type: currentPage?.includes('payment') ? 'payment' : 'general' },
        },
      ],
      escalateToHuman: true,
      escalationReason: 'Learner explicitly requested human help',
      escalationType: currentPage?.includes('payment') ? 'payment' : 'general',
      language,
    };
  }

  // Registration Voice Actions
  if (currentPage === '/register' || lowerMsg.startsWith('my name is ') || lowerMsg.startsWith('name is ') || lowerMsg.startsWith('email is ')) {
    if (lowerMsg.includes('my name is ') || lowerMsg.startsWith('name is ')) {
      const name = message.replace(/^(my name is|name is)\s+/i, '').trim();
      const action = validateAction('fill_field', { field: 'name', value: name });
      return {
        reply: `I have entered your name as ${name}. Is that correct, or would you like to spell it letter by letter?`,
        actions: action ? [action] : [],
        escalateToHuman: false,
        language,
      };
    }

    if (lowerMsg.includes('my email is ') || lowerMsg.startsWith('email is ') || lowerMsg.includes('@')) {
      const email = message.replace(/^(my email is|email is)\s+/i, '').trim();
      const action = validateAction('fill_field', { field: 'email', value: email });
      return {
        reply: `I have recorded your email as ${email}. Shall I proceed or correct it?`,
        actions: action ? [action] : [],
        escalateToHuman: false,
        language,
      };
    }
  }

  // Navigation Intents (FR-1.5)
  if (lowerMsg.includes('go to courses') || lowerMsg.includes('browse courses')) {
    const action = validateAction('go_to_page', { path: '/courses' });
    return {
      reply: 'Taking you to the course catalog now.',
      actions: action ? [action] : [],
      escalateToHuman: false,
      language,
    };
  }

  if (lowerMsg.includes('go to payment') || lowerMsg.includes('how to pay')) {
    const action = validateAction('go_to_page', { path: '/payment' });
    return {
      reply: 'Navigating to the human-assisted payment page.',
      actions: action ? [action] : [],
      escalateToHuman: false,
      language,
    };
  }

  // 3. Grounded Knowledge Base Retrieval (RAG) (FR-11.2, FR-11.3)
  const chunks = await searchKnowledgeBase(message, language);
  const knowledgeContext = chunks.map((c) => `[Source: ${c.source}] ${c.text}`).join('\n\n');

  // If Gemini API Key is configured in environment, call Gemini
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = `${buildSystemPrompt(language, knowledgeContext)}\n\nLearner Query: ${message}`;
      
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        contents: prompt,
      });

      const replyText = response.text?.trim() || 'I am ready to help you navigate Ableway.';

      return {
        reply: replyText,
        actions: [],
        escalateToHuman: false,
        language,
        sources: chunks.map((c) => c.source),
      };
    } catch (apiError) {
      console.warn('[Gemini API] Failed, falling back to grounded knowledge extractor:', apiError);
    }
  }

  // Grounded Deterministic Fallback if Gemini key is not set yet
  const bestChunk = chunks[0];
  return {
    reply: bestChunk ? bestChunk.text : 'I am here to guide you. You can ask me about courses, registration, or say "call human" at any time.',
    actions: [],
    escalateToHuman: false,
    language,
    sources: chunks.map((c) => c.source),
  };
}

