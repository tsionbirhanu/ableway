export interface SafetyCheckResult {
  isSafe: boolean;
  isDistressed: boolean;
  isOffTopic: boolean;
  escalationReason?: string;
  sanitizedText: string;
}

const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /disregard/i,
  /you are now an unfiltered/i,
  /jailbreak/i,
  /roleplay as an admin/i,
];

const DISTRESS_PATTERNS = [
  /i want to give up/i,
  /i can't do this anymore/i,
  /i am crying/i,
  /nobody is helping me/i,
  /so frustrated/i,
  /scared/i,
  /feel helpless/i,
];

const OFF_TOPIC_PATTERNS = [
  /prescribe/i,
  /diagnose/i,
  /invest in crypto/i,
  /legal lawsuit/i,
  /medical treatment/i,
];

export function sanitizeAndCheckSafety(text: string): SafetyCheckResult {
  const sanitizedText = text.trim();

  // 1. Check prompt injection attacks in forwarded text or user input
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitizedText)) {
      return {
        isSafe: false,
        isDistressed: false,
        isOffTopic: true,
        escalationReason: 'Potentially malicious prompt injection detected.',
        sanitizedText,
      };
    }
  }

  // 2. Check signs of distress (FR-10.2 requirement to escalate to human)
  for (const pattern of DISTRESS_PATTERNS) {
    if (pattern.test(sanitizedText)) {
      return {
        isSafe: true,
        isDistressed: true,
        isOffTopic: false,
        escalationReason: 'Learner expressed distress or strong frustration.',
        sanitizedText,
      };
    }
  }

  // 3. Check out-of-scope / medical / legal topics
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(sanitizedText)) {
      return {
        isSafe: true,
        isDistressed: false,
        isOffTopic: true,
        escalationReason: 'Question is outside platform scope (medical/legal/financial).',
        sanitizedText,
      };
    }
  }

  return {
    isSafe: true,
    isDistressed: false,
    isOffTopic: false,
    sanitizedText,
  };
}

