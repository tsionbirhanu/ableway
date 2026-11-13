import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Columns every table has.
 *
 * updated_at is kept correct two ways:
 * - $onUpdate sets it for updates made through Drizzle.
 * - A database trigger (drizzle/0002_updated_at_triggers.sql) sets it for
 *   every other update, including raw SQL and admin tools.
 */
export const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
