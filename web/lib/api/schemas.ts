import { z } from "zod";

/**
 * Shared Zod pieces for API input. Bodies use z.strictObject, so unknown
 * fields are rejected (400) rather than silently ignored.
 */

/** BCP 47-ish language tag such as "en", "am" or "am-ET". */
export const languageTag = z
  .string()
  .trim()
  .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, { error: "Use a language code like en or am." });

/** An app path such as "/courses". Never a full URL, so it cannot point elsewhere. */
export const appPath = z
  .string()
  .trim()
  .max(300)
  .regex(/^\/(?!\/)[^\s]*$/, { error: "Use a path that starts with /" });

/** Query-string integer with bounds and a default. */
export const queryInt = (min: number, max: number, fallback: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);

/** Course id or slug from the URL. */
export const courseRef = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9-]+$/);

export const isUuid = (value: string) => z.uuid().safeParse(value).success;
