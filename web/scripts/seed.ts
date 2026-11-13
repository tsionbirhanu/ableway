/**
 * Add sample courses, jobs, and fake people. Safe to run more than once.
 * Usage: pnpm db:seed
 *
 * Refuses to run when NODE_ENV is "production" unless you pass
 * --allow-production, so fake learners never reach real data by accident.
 */
import { createDb } from "../lib/db/client";
import { seed } from "../lib/db/seed";
import { databaseUrlFromEnv, describeDatabase } from "./db-url";

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
    throw new Error("NODE_ENV is production. Re-run with --allow-production if you are sure.");
  }
  const url = databaseUrlFromEnv();
  const { db, pool } = createDb(url);
  console.log(`Seeding ${describeDatabase(url)} ...`);
  try {
    const summary = await seed(db);
    console.table(summary);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
