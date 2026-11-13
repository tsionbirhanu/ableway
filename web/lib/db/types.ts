import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/**
 * Any Drizzle Postgres database built with our schema: Neon in the app,
 * PGlite in tests. Code takes this type so it works with both.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** A transaction handle, for helpers that run inside db.transaction(). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
