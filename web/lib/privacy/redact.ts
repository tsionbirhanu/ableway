import type { MessageFlag } from "@/lib/db/json-types";

/**
 * Redacts sensitive credentials (card numbers, PINs, passwords)
 * so they are never persisted to the database.
 */
export function redactSensitiveData(text: string): { cleanText: string; flags: MessageFlag[] } {
  let cleanText = text;
  const flags: MessageFlag[] = [];

  // 13-19 digit card numbers
  const cardRegex = /\b(?:\d[ -]*?){13,19}\b/g;
  if (cardRegex.test(cleanText)) {
    flags.push("sensitive_data_redacted");
    cleanText = cleanText.replace(cardRegex, "[REDACTED_CARD]");
  }

  // PIN / password patterns
  const pinRegex = /\b(?:secret\s+)?(?:pin|password|cvv|secret|code)\s*[:=]?\s*([A-Za-z0-9_-]+)/gi;
  if (pinRegex.test(cleanText)) {
    if (!flags.includes("sensitive_data_redacted")) {
      flags.push("sensitive_data_redacted");
    }
    cleanText = cleanText.replace(pinRegex, "[REDACTED_CREDENTIAL]");
  }

  return { cleanText, flags };
}
