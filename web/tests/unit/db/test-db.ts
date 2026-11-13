import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import * as schema from "@/lib/db/schema";

export const migrationsFolder = fileURLToPath(new URL("../../../drizzle", import.meta.url));

/**
 * A brand-new in-memory Postgres (PGlite) with pgvector, with every
 * migration in ./drizzle applied. The same SQL files run on Neon.
 */
export async function createTestDb() {
  const client = new PGlite({ extensions: { vector } });
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder });
  return { db, client };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;
