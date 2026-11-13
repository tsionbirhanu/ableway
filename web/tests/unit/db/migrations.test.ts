import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { allTables } from "@/lib/db/schema";
import { createTestDb, migrationsFolder, type TestDb } from "./test-db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);

afterAll(async () => {
  await t?.client.close();
});

const tableNames = Object.values(allTables).map((table) => getTableConfig(table).name);

async function rows<T>(query: string, params: unknown[] = []): Promise<T[]> {
  return (await t.client.query<T>(query, params)).rows;
}

describe("migrations on a clean database", () => {
  it("enables pgvector", async () => {
    const ext = await rows<{ extname: string }>(
      "select extname from pg_extension where extname = 'vector'",
    );
    expect(ext).toHaveLength(1);
  });

  it("creates every table in the schema, and no others", async () => {
    const found = await rows<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    expect(found.map((r) => r.table_name).sort()).toEqual([...tableNames].sort());
  });

  it("gives every table id, created_at and updated_at", async () => {
    for (const table of tableNames) {
      const cols = await rows<{ column_name: string; data_type: string; is_nullable: string }>(
        `select column_name, data_type, is_nullable from information_schema.columns
         where table_schema = 'public' and table_name = $1
           and column_name in ('id', 'created_at', 'updated_at') order by column_name`,
        [table],
      );
      expect(cols, table).toEqual([
        { column_name: "created_at", data_type: "timestamp with time zone", is_nullable: "NO" },
        { column_name: "id", data_type: "uuid", is_nullable: "NO" },
        { column_name: "updated_at", data_type: "timestamp with time zone", is_nullable: "NO" },
      ]);
    }
  });

  it("has an updated_at trigger on every table", async () => {
    const triggers = await rows<{ event_object_table: string }>(
      `select event_object_table from information_schema.triggers
       where trigger_name like '%_set_updated_at' and event_manipulation = 'UPDATE'`,
    );
    expect(triggers.map((r) => r.event_object_table).sort()).toEqual([...tableNames].sort());
  });

  it("has an HNSW cosine index on knowledge_chunks.embedding", async () => {
    const [index] = await rows<{ indexdef: string }>(
      "select indexdef from pg_indexes where indexname = 'knowledge_chunks_embedding_hnsw_idx'",
    );
    expect(index?.indexdef).toMatch(/USING hnsw \(embedding vector_cosine_ops\)/);
  });

  it("stores 768-dimension embeddings", async () => {
    const [col] = await rows<{ type: string }>(
      `select format_type(atttypid, atttypmod) as type from pg_attribute
       where attrelid = 'knowledge_chunks'::regclass and attname = 'embedding'`,
    );
    expect(col?.type).toBe("vector(768)");
  });

  it("indexes every foreign key column (as the first column of some index)", async () => {
    const unindexed = await rows<{ table_name: string; column_name: string }>(`
      select c.conrelid::regclass::text as table_name, a.attname as column_name
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f'
        and not exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]
        )`);
    expect(unindexed).toEqual([]);
  });

  it("indexes every status column", async () => {
    const statusColumns = await rows<{ table_name: string; column_name: string }>(`
      select table_name, column_name from information_schema.columns
      where table_schema = 'public' and column_name in ('status', 'active', 'resolved')`);
    expect(statusColumns.length).toBeGreaterThan(0);
    for (const { table_name, column_name } of statusColumns) {
      const indexes = await rows<{ indexdef: string }>(
        "select indexdef from pg_indexes where tablename = $1",
        [table_name],
      );
      const covered = indexes.some((i) => new RegExp(`\\(${column_name}[,)]`).test(i.indexdef));
      expect(covered, `${table_name}.${column_name}`).toBe(true);
    }
  });

  it("has a unique (subscription_id, job_id) on alert_deliveries", async () => {
    const [index] = await rows<{ indexdef: string }>(
      "select indexdef from pg_indexes where indexname = 'alert_deliveries_subscription_job_key'",
    );
    expect(index?.indexdef).toMatch(/UNIQUE INDEX .*\(subscription_id, job_id\)/);
  });

  it("migration files match the journal (nothing un-generated)", () => {
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };
    const sqlFiles = readdirSync(migrationsFolder).filter((f) => f.endsWith(".sql"));
    expect(sqlFiles.sort()).toEqual(journal.entries.map((e) => `${e.tag}.sql`).sort());
    expect(journal.entries[0]?.tag).toBe("0000_enable_pgvector");
  });

  it("can run migrations twice without error", async () => {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await expect(migrate(t.db, { migrationsFolder })).resolves.toBeUndefined();
  });
});
