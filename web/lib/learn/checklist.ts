import { BadRequestError } from "@/lib/auth/errors";

export interface LessonChecklistInput {
  title: string;
  transcript?: string | null;
  audioUrl?: string | null;
  status: "draft" | "published";
  imageDescriptions?: Record<string, string> | null;
}

export interface ChecklistValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the strict publishing checklist for lessons:
 * A lesson cannot be published without:
 * 1. A transcript.
 * 2. Audio or text (transcript satisfies text).
 * 3. A text description for every image.
 */
export function validateLessonPublishChecklist(input: LessonChecklistInput): ChecklistValidationResult {
  const errors: string[] = [];

  if (input.status !== "published") {
    // Drafts do not require all checklist items yet
    return { valid: true, errors: [] };
  }

  // 1. Transcript is required and non-empty
  const transcript = input.transcript?.trim() ?? "";
  if (!transcript || transcript.length < 5) {
    errors.push("A published lesson must have a non-empty transcript.");
  }

  // 2. Audio or text (audioUrl or transcript)
  const hasAudio = !!input.audioUrl?.trim();
  const hasText = transcript.length > 0;
  if (!hasAudio && !hasText) {
    errors.push("A published lesson must provide either audio or text content.");
  }

  // 3. A text description for every image
  // Check Markdown images: ![alt](url)
  const markdownImgRegex = /!\[(.*?)\]\((.*?)\)/g;
  let match: RegExpExecArray | null;

  while ((match = markdownImgRegex.exec(transcript)) !== null) {
    const altText = match[1]?.trim();
    if (!altText) {
      errors.push("Every image in the lesson transcript must have a descriptive alternative text.");
      break;
    }
  }

  // Check HTML img tags: <img ...>
  const htmlImgRegex = /<img\b([^>]*)>/gi;
  while ((match = htmlImgRegex.exec(transcript)) !== null) {
    const attrs = match[1] || "";
    const altMatch = /alt=["']([^"']*)["']/i.exec(attrs);
    if (!altMatch || !altMatch[1]?.trim()) {
      errors.push("Every HTML image in the lesson transcript must have a non-empty alt description.");
      break;
    }
  }

  // Check explicit imageDescriptions record if provided
  if (input.imageDescriptions) {
    for (const [imgId, desc] of Object.entries(input.imageDescriptions)) {
      if (!desc || !desc.trim()) {
        errors.push(`Image "${imgId}" is missing a required text description.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Throws BadRequestError if the lesson fails the publish checklist.
 */
export function assertLessonPublishChecklist(input: LessonChecklistInput): void {
  const result = validateLessonPublishChecklist(input);
  if (!result.valid) {
    throw new BadRequestError(`Cannot publish lesson: ${result.errors.join(" ")}`);
  }
}

