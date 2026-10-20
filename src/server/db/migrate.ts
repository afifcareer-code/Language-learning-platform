import { join } from "node:path";
import { migrate as migrateLibsql } from "drizzle-orm/libsql/migrator";
import { migrate as migrateMysql } from "drizzle-orm/mysql2/migrator";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import mysql from "mysql2/promise";
import pg from "pg";
import type { Database } from "./client";
import type { DatabaseConfig, Dialect } from "./config";

/** Migrations for each dialect live in database/migrations/<dialect>. */
export function migrationsFolder(dialect: Dialect): string {
  return join(process.cwd(), "database", "migrations", dialect);
}

const LOCK_NAME = "language_learning_platform_migrations";
const LOCK_KEY = 727_451_003; // arbitrary constant for pg_advisory_lock

/**
 * Run `task` while holding a database-wide lock, so that several app
 * processes starting at once (e.g. Passenger on cPanel) do not migrate
 * concurrently. SQLite is single-host and relies on its own file locking.
 */
export async function withMigrationLock<T>(config: DatabaseConfig, task: () => Promise<T>): Promise<T> {
  if (config.dialect === "mysql") {
    const conn = await mysql.createConnection({ uri: config.url });
    try {
      const [rows] = await conn.query("SELECT GET_LOCK(?, 300) AS acquired", [LOCK_NAME]);
      if ((rows as { acquired: number | null }[])[0]?.acquired !== 1)
        throw new Error("Timed out waiting for the migration lock");
      return await task();
    } finally {
      await conn.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]).catch(() => undefined);
      await conn.end();
    }
  }
  if (config.dialect === "postgres") {
    const client = new pg.Client({ connectionString: config.url });
    await client.connect();
    try {
      await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
      return await task();
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => undefined);
      await client.end();
    }
  }
  return task();
}

/** Apply pending migrations for the database's dialect. */
export async function runMigrations(db: Database): Promise<void> {
  const folder = migrationsFolder(db.engine);
  // Each migrator expects its own driver's database type; `db` is the matching instance.
  const orm = db as never;
  switch (db.engine) {
    case "sqlite":
      return migrateLibsql(orm, { migrationsFolder: folder });
    case "mysql":
      return migrateMysql(orm, { migrationsFolder: folder });
    case "postgres":
      return migratePostgres(orm, { migrationsFolder: folder });
  }
}
