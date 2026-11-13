/**
 * Read and check DATABASE_URL for command-line scripts.
 * Loads .env.local and .env (like Next.js). Only DATABASE_URL is required
 * here, so you can migrate or seed without filling in every other key.
 */
import { EnvError, envSchema } from "../lib/env";
import { DEFAULT_ENV_FILES, loadEnvFiles } from "./load-env";

export function databaseUrlFromEnv(envFiles: readonly string[] = DEFAULT_ENV_FILES): string {
  loadEnvFiles(envFiles);
  const result = envSchema.pick({ DATABASE_URL: true }).safeParse(process.env);
  if (!result.success) {
    throw new EnvError(result.error.issues.map((issue) => `DATABASE_URL ${issue.message}`));
  }
  return result.data.DATABASE_URL;
}

/** Host only, so logs show which database we used without the password. */
export function describeDatabase(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname}`;
  } catch {
    return "(unparseable URL)";
  }
}
