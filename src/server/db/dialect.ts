import { getTableColumns, sql } from "drizzle-orm";
import type {
  SQLiteColumn,
  SQLiteInsertValue,
  SQLiteTable,
  SQLiteUpdateSetSource,
} from "drizzle-orm/sqlite-core";
import type { Database, Executor } from "./client";

/**
 * Insert or update on primary/unique key conflict.
 * MySQL uses ON DUPLICATE KEY UPDATE; SQLite and PostgreSQL use ON CONFLICT.
 */
export async function upsert<T extends SQLiteTable>(
  db: Database,
  executor: Executor,
  table: T,
  values: SQLiteInsertValue<T>,
  options: { target: SQLiteColumn[]; set: SQLiteUpdateSetSource<T> },
): Promise<void> {
  const insert = executor.insert(table).values(values);
  if (db.engine === "mysql") {
    await (insert as unknown as MysqlInsert).onDuplicateKeyUpdate({ set: options.set });
  } else {
    await insert.onConflictDoUpdate({ target: options.target, set: options.set });
  }
}

/** Insert unless a row with the same key already exists. */
export async function insertIgnore<T extends SQLiteTable>(
  db: Database,
  executor: Executor,
  table: T,
  values: SQLiteInsertValue<T>,
  key: SQLiteColumn,
): Promise<void> {
  const insert = executor.insert(table).values(values);
  if (db.engine === "mysql") {
    // Self-assignment is MySQL's idiomatic "do nothing" on duplicate key.
    const property = Object.entries(getTableColumns(table)).find(([, column]) => column === key)?.[0];
    if (!property) throw new Error(`Column ${key.name} does not belong to the table`);
    await (insert as unknown as MysqlInsert).onDuplicateKeyUpdate({ set: { [property]: sql`${key}` } });
  } else {
    await insert.onConflictDoNothing();
  }
}

interface MysqlInsert {
  onDuplicateKeyUpdate(config: { set: unknown }): Promise<unknown>;
}
