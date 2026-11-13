import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

export type { Db } from "./types";
import type { Db } from "./types";

/**
 * Neon over WebSockets. Unlike the HTTP driver, this supports interactive
 * transactions, which payments and enrollments need.
 * Node 22+ has a global WebSocket, so no extra setup is needed.
 */
export function createDb(databaseUrl: string): { db: NeonDatabase<typeof schema>; pool: Pool } {
  const pool = new Pool({ connectionString: databaseUrl });
  return { db: drizzle({ client: pool, schema }), pool };
}

// Reuse one pool per server process (and across dev hot reloads).
const globalForDb = globalThis as unknown as { ablewayDb?: Db };

export function getDb(): Db {
  globalForDb.ablewayDb ??= createDb(getEnv().DATABASE_URL).db;
  return globalForDb.ablewayDb;
}
