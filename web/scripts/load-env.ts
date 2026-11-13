/**
 * Load env files for command-line scripts, the same way Next.js does:
 * .env.local first, then .env. A value that is already set always wins,
 * so real environment variables (for example in CI) override both files.
 */
import { existsSync } from "node:fs";

export const DEFAULT_ENV_FILES = [".env.local", ".env"] as const;

/** Returns the files that were found and loaded. */
export function loadEnvFiles(files: readonly string[] = DEFAULT_ENV_FILES): string[] {
  const loaded: string[] = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    // process.loadEnvFile never overwrites variables that are already set.
    process.loadEnvFile(file);
    loaded.push(file);
  }
  return loaded;
}
