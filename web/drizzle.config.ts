import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit config. `generate` needs no database.
 * `migrate`, `studio` and `check` read DATABASE_URL from the environment.
 * Prefer `pnpm db:migrate` (scripts/migrate.ts) for applying migrations.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  ...(process.env.DATABASE_URL ? { dbCredentials: { url: process.env.DATABASE_URL } } : {}),
});
