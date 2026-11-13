import type { ZodError } from "zod";

export type FormState = {
  status: "idle" | "error";
  /** Read out first, in the error summary. */
  message?: string;
  /** One plain-language message per field. */
  fieldErrors?: Record<string, string>;
  /** Values to put back in the form. Never includes the password. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

/** The first error message for each field. */
export function firstErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    result[field] ??= issue.message;
  }
  return result;
}
