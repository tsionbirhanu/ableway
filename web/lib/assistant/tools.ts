import { z } from "zod";
import type { AssistantActionResult, PageContext } from "./types";

// =====================================================================
// Tool Zod Schemas
// =====================================================================

export const fillFieldSchema = z.strictObject({
  field: z.string().trim().min(1, "Field name is required"),
  value: z.string(),
});

export const readBackSchema = z.strictObject({
  message: z.string().optional(),
});

/**
 * Only paths on this site, such as "/courses". Never a full URL, "//host",
 * or "javascript:", so injected text cannot send the learner elsewhere.
 */
export const goToPageSchema = z.strictObject({
  page: z
    .string()
    .trim()
    .min(1, "Page path is required")
    .max(200)
    .regex(/^\/(?![\/\\])[A-Za-z0-9\-._~/?=&%#]*$/, "Use a path on this site, like /courses"),
});

export const selectCourseSchema = z.strictObject({
  courseId: z.string().trim().min(1, "Course ID is required"),
});

export const requestHumanSchema = z.strictObject({
  type: z.enum(["payment", "general", "technical", "telegram", "urgent"]).default("general"),
  reason: z.string().trim().min(1, "Reason is required"),
});

export const startQuizSchema = z.strictObject({
  quizId: z.string().trim().min(1, "Quiz ID is required"),
});

export const openModuleSchema = z.strictObject({
  moduleId: z.string().trim().min(1, "Module ID is required"),
});

export const readJobSchema = z.strictObject({
  jobId: z.string().trim().min(1, "Job ID is required"),
});

export const TOOL_SCHEMAS = {
  fill_field: fillFieldSchema,
  read_back: readBackSchema,
  go_to_page: goToPageSchema,
  select_course: selectCourseSchema,
  request_human: requestHumanSchema,
  start_quiz: startQuizSchema,
  open_module: openModuleSchema,
  read_job: readJobSchema,
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;

// =====================================================================
// Gemini Tool Declarations
// =====================================================================

export const GEMINI_TOOL_DECLARATIONS = [
  {
    name: "fill_field",
    description: "Fill a form input field on the current page (e.g. email, phone, name, keywords).",
    parameters: {
      type: "OBJECT",
      properties: {
        field: {
          type: "STRING",
          description: "The field identifier or label (e.g. email, phone, name)",
        },
        value: { type: "STRING", description: "The value to fill into the input field" },
      },
      required: ["field", "value"],
    },
  },
  {
    name: "read_back",
    description: "Read back form inputs or confirmation details aloud to the learner.",
    parameters: {
      type: "OBJECT",
      properties: {
        message: {
          type: "STRING",
          description: "Optional specific message or values to read back",
        },
      },
    },
  },
  {
    name: "go_to_page",
    description: "Navigate the learner to another page on the Ableway website.",
    parameters: {
      type: "OBJECT",
      properties: {
        page: {
          type: "STRING",
          description: "The path to navigate to, e.g. /courses, /profile, /jobs",
        },
      },
      required: ["page"],
    },
  },
  {
    name: "select_course",
    description: "Choose and select a course to start the enrollment flow.",
    parameters: {
      type: "OBJECT",
      properties: {
        courseId: { type: "STRING", description: "The unique identifier or slug of the course" },
      },
      required: ["courseId"],
    },
  },
  {
    name: "request_human",
    description: "Connect the learner with a human staff helper for payment or support.",
    parameters: {
      type: "OBJECT",
      properties: {
        type: {
          type: "STRING",
          description: "Type of help needed: payment, general, technical, telegram, or urgent",
        },
        reason: { type: "STRING", description: "Brief reason for requesting human help" },
      },
      required: ["reason"],
    },
  },
  {
    name: "start_quiz",
    description: "Start an interactive lesson quiz.",
    parameters: {
      type: "OBJECT",
      properties: {
        quizId: { type: "STRING", description: "The quiz ID to start" },
      },
      required: ["quizId"],
    },
  },
  {
    name: "open_module",
    description: "Open a specific learning module in a course.",
    parameters: {
      type: "OBJECT",
      properties: {
        moduleId: { type: "STRING", description: "The module ID to open" },
      },
      required: ["moduleId"],
    },
  },
  {
    name: "read_job",
    description: "Open and read out the full details of an accessible job posting.",
    parameters: {
      type: "OBJECT",
      properties: {
        jobId: { type: "STRING", description: "The job ID to read" },
      },
      required: ["jobId"],
    },
  },
];

// Mapping to/from camelCase for frontend component compatibility
const CAMEL_TO_SNAKE: Record<string, ToolName> = {
  fillField: "fill_field",
  readBack: "read_back",
  goToPage: "go_to_page",
  selectCourse: "select_course",
  requestHuman: "request_human",
  callPerson: "request_human",
  startQuiz: "start_quiz",
  openModule: "open_module",
  readJob: "read_job",
};

export function normalizeToolName(name: string): ToolName | null {
  if (name in TOOL_SCHEMAS) return name as ToolName;
  if (name in CAMEL_TO_SNAKE) return CAMEL_TO_SNAKE[name];
  return null;
}

// =====================================================================
// Page Permission Validation
// =====================================================================

/**
 * Checks whether an action is permitted on the current page.
 * Rejects any action not allowed on the current page.
 */
export function isActionAllowedOnPage(
  actionName: ToolName,
  pageContext?: PageContext | null,
): boolean {
  if (!pageContext) return true;

  // 1. If explicit allowedActions are provided in context, respect them strictly
  if (Array.isArray(pageContext.allowedActions) && pageContext.allowedActions.length > 0) {
    const allowed = pageContext.allowedActions.map((a) => normalizeToolName(a) || a);
    if (!allowed.includes(actionName)) {
      return false;
    }
  }

  // 2. Path-based context validation
  const page = pageContext.page?.toLowerCase() ?? "";
  if (!page) return true;

  switch (actionName) {
    case "select_course":
      return page.startsWith("/courses") || page.startsWith("/payment") || page === "/";

    case "fill_field":
      // Only allowed on pages with interactive forms
      return (
        page.startsWith("/register") ||
        page.startsWith("/login") ||
        page.startsWith("/profile") ||
        page.startsWith("/payment")
      );

    case "start_quiz":
      return page.startsWith("/learn") || page.startsWith("/quiz") || page.startsWith("/courses");

    case "open_module":
      return page.startsWith("/learn") || page.startsWith("/courses");

    case "read_job":
      return page.startsWith("/jobs");

    case "go_to_page":
    case "read_back":
    case "request_human":
      // Always allowed globally
      return true;

    default:
      return false;
  }
}

/**
 * Validates a tool call with Zod and checks page permissions.
 * Returns the parsed action result or null if invalid or forbidden.
 */
export function validateAndFilterAction(
  rawName: string,
  rawArgs: unknown,
  pageContext?: PageContext | null,
): AssistantActionResult | null {
  const normalizedName = normalizeToolName(rawName);
  if (!normalizedName) return null;

  // Check page permission
  if (!isActionAllowedOnPage(normalizedName, pageContext)) {
    return null;
  }

  // Validate arguments with Zod
  const schema = TOOL_SCHEMAS[normalizedName];
  const parsed = schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return null;
  }

  return {
    name: normalizedName,
    params: parsed.data as Record<string, unknown>,
  };
}
