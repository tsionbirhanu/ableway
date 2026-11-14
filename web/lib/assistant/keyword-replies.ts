/**
 * Keyword replies for the web assistant.
 *
 * TODO: replace with the shared assistant core (Gemini + function calling)
 * used by both web and Telegram.
 *
 * The learner's text is untrusted. We only match keywords in it; we never
 * follow instructions in it or echo it back.
 */

export type Action =
  | { name: "go_to_page"; params: { path: string } }
  | {
      name: "request_human";
      params: { reason: string; type: "general" | "payment" };
    };

export type Reply = {
  reply: string;
  spokenReply?: string;
  actions: Action[];
  escalateToHuman: boolean;
  language: string;
};

const includesAny = (text: string, words: string[]) => words.some((w) => text.includes(w));

export function replyTo(message: string, language: string): Reply {
  const text = message.toLowerCase().trim();

  if (includesAny(text, ["human", "agent", "call staff", "help me", "helper"])) {
    return {
      reply: "I am asking a human helper for you now. Someone will help you soon.",
      spokenReply: "I am calling a human helper for you now.",
      actions: [
        {
          name: "request_human",
          params: { reason: "Learner asked for human help", type: "general" },
        },
      ],
      escalateToHuman: true,
      language,
    };
  }
  if (includesAny(text, ["register", "sign up", "create account"])) {
    return {
      reply: "I will open the registration page. I can fill the form as you speak.",
      actions: [{ name: "go_to_page", params: { path: "/register" } }],
      escalateToHuman: false,
      language,
    };
  }
  if (includesAny(text, ["pay", "cost", "price"])) {
    return {
      reply:
        "A human helper helps you pay. They never ask for your PIN or password. I will open the payment page.",
      actions: [{ name: "go_to_page", params: { path: "/payment" } }],
      escalateToHuman: false,
      language,
    };
  }
  if (includesAny(text, ["course", "class", "learn"])) {
    return {
      reply: "I will open the list of courses. You can hear each one and choose.",
      actions: [{ name: "go_to_page", params: { path: "/courses" } }],
      escalateToHuman: false,
      language,
    };
  }
  return {
    reply:
      "I am the Ableway assistant. I can help you sign up, choose a course, pay with a helper, and learn. What would you like to do?",
    actions: [],
    escalateToHuman: false,
    language,
  };
}
