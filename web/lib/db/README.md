# lib/db

Drizzle ORM schema and Neon Postgres client.

- `schema.ts`: all tables, enums, indexes, and check constraints.
- `json-types.ts`: Zod schemas for every jsonb column. Validate with these before writing.
- `columns.ts`: `id`, `created_at`, `updated_at`, shared by every table.
- `client.ts`: `getDb()` for server code (`server-only`). Uses Neon over WebSockets so transactions work.
- `seed.ts` and `seed-data.ts`: sample data. Fake people only.

## Migrations

Migrations live in `/drizzle` and run in order:

1. `0000_enable_pgvector.sql`: custom, enables the `vector` extension.
2. `0001_init.sql`: generated from `schema.ts`.
3. `0002_updated_at_triggers.sql`: custom, a trigger on every table keeps `updated_at` correct.

After changing `schema.ts`, run `pnpm db:generate` and commit the new SQL file.
If you add a table, also add its trigger in a new custom migration
(`pnpm exec drizzle-kit generate --custom --name=<name>`) and add the table to `allTables`.
The tests fail if a table has no trigger.

## Notes

- Money is stored as integers in the smallest unit (`price_minor`, `amount_minor`) with an ISO currency code.
- `payment_records` has no free-text column, so card numbers, PINs or passwords cannot be typed into it.
- `knowledge_chunks.embedding` is `vector(768)` with an HNSW cosine index. Seeded chunks are drafts with
  no embedding. TODO: embed them with Gemini once `lib/knowledge` exists.
