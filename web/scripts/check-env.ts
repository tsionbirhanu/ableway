/**
 * Check env variables without starting the server.
 * Usage: pnpm env:check            (reads .env.local and .env, like Next.js)
 *        pnpm env:check .env.prod  (reads only the given file)
 *
 * Runs with the "react-server" condition so the server-only import in
 * lib/env.ts is allowed. Prints variable names only, never values.
 */
import { existsSync } from "node:fs";
import { EnvError, parseEnv } from "../lib/env";
import { loadEnvFiles } from "./load-env";

const file = process.argv[2];

if (file && !existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}
const loaded = loadEnvFiles(file ? [file] : undefined);
console.log(
  loaded.length ? `Read: ${loaded.join(", ")}` : "No env file found. Using shell variables.",
);

try {
  parseEnv(process.env);
  console.log("Environment variables are valid.");
} catch (error) {
  if (error instanceof EnvError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
