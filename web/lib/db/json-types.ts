import { z } from "zod";

/**
 * Zod schemas for every jsonb column. Validate with these before writing
 * to the database, and when reading data you did not write yourself.
 * The schema in ./schema.ts uses the inferred types via $type<>().
 */

// ---------- profiles.accessibility ----------

export const contrastModes = ["standard", "high", "inverted"] as const;
export const textSizes = ["default", "large", "x_large"] as const;
export const interactionModes = ["voice", "text", "voice_and_text"] as const;

export const accessibilitySettingsSchema = z.strictObject({
  /** 1 is normal speed. Screen reader users often prefer fast speech. */
  speechRate: z.number().min(0.5).max(3),
  /** Voice id from the TTS provider. "default" lets the provider choose. */
  voice: z.string().trim().min(1).max(100),
  contrast: z.enum(contrastModes),
  textSize: z.enum(textSizes),
  interactionMode: z.enum(interactionModes),
});
export type AccessibilitySettings = z.infer<typeof accessibilitySettingsSchema>;

export const defaultAccessibilitySettings: AccessibilitySettings = {
  speechRate: 1,
  voice: "default",
  contrast: "standard",
  textSize: "default",
  interactionMode: "voice_and_text",
};

// ---------- enrollments.progress / last_position ----------

const uuid = z.uuid();

export const quizResultSchema = z.strictObject({
  /** Best score as a percentage, 0-100. */
  bestScore: z.number().int().min(0).max(100),
  passed: z.boolean(),
  attempts: z.number().int().min(1),
});

export const enrollmentProgressSchema = z.strictObject({
  completedLessonIds: z.array(uuid),
  /** Keyed by quiz id. */
  quizResults: z.record(z.uuid(), quizResultSchema),
});
export type EnrollmentProgress = z.infer<typeof enrollmentProgressSchema>;

export const emptyProgress: EnrollmentProgress = { completedLessonIds: [], quizResults: {} };

/** Where the learner stopped, so the assistant can say "Let's continue from...". */
export const lastPositionSchema = z.strictObject({
  lessonId: uuid,
  /** Seconds into the lesson audio. */
  audioSeconds: z.number().min(0),
});
export type LastPosition = z.infer<typeof lastPositionSchema>;

// ---------- quiz_questions.choices ----------

export const quizChoicesSchema = z.array(z.string().trim().min(1).max(500)).min(2).max(6);
export type QuizChoices = z.infer<typeof quizChoicesSchema>;

// ---------- messages.flags ----------

export const messageFlags = [
  /** We removed card numbers, PINs or passwords before storing. */
  "sensitive_data_redacted",
  /** Text looked like it was trying to give the assistant instructions. */
  "possible_prompt_injection",
  /** Text came from a forwarded Telegram message. */
  "forwarded_content",
  /** This message caused a handover to a human helper. */
  "handoff_triggered",
  /** The assistant could not answer. */
  "unanswered",
] as const;

export const messageFlagsSchema = z.array(z.enum(messageFlags)).max(messageFlags.length);
export type MessageFlag = (typeof messageFlags)[number];

// ---------- audit_log.metadata ----------

const jsonPrimitive = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);

/** Flat key/value data only, so audit rows stay small and easy to read. */
export const auditMetadataSchema = z.record(
  z.string().max(100),
  z.union([jsonPrimitive, z.array(jsonPrimitive).max(50)]),
);
export type AuditMetadata = z.infer<typeof auditMetadataSchema>;
