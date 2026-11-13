/**
 * Apply all pending migrations in ./drizzle to DATABASE_URL.
 * Usage: pnpm db:migrate
 */
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { createDb } from "../lib/db/client";
import { databaseUrlFromEnv, describeDatabase } from "./db-url";

async function main() {
  const url = databaseUrlFromEnv();
  const { db, pool } = createDb(url);
  console.log(`Running migrations on ${describeDatabase(url)} ...`);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations are up to date.");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
