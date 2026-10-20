import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle as drizzleLibsql, type LibSQLDatabase } from "drizzle-orm/libsql";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import mysql from "mysql2/promise";
import pg from "pg";
import { describeDatabase, resolveDatabaseConfig, type DatabaseConfig, type Dialect } from "./config";
import { mysqlSchema, postgresSchema, sqliteSchema, tablesFor, type Tables } from "./schema";

type Orm = LibSQLDatabase<typeof sqliteSchema>;

/**
 * A database connection for any supported dialect.
 *
 * Queries are written once with Drizzle's query builder against `db.t`
 * (the dialect's tables); the few dialect-specific statements go through
 * helpers in ./dialect.ts. The SQLite ORM type is used for all dialects
 * because the query-builder surface the app uses is shared.
 */
export type Database = Orm & {
  /** Which database engine this connection talks to. (`dialect` is reserved by Drizzle.) */
  engine: Dialect;
  t: Tables;
  config: DatabaseConfig;
  /** Round-trip to the server; throws if the database is unreachable. */
  ping(): Promise<void>;
  close(): Promise<void>;
};

export type Transaction = Parameters<Parameters<Orm["transaction"]>[0]>[0];
export type Executor = Database | Transaction;

export function createDatabase(config: DatabaseConfig): Database {
  let orm: unknown;
  let close: () => Promise<void>;
  let ping: () => Promise<void>;

  switch (config.dialect) {
    case "sqlite": {
      if (config.url.startsWith("file:") && !config.url.includes(":memory:")) {
        mkdirSync(dirname(config.url.slice("file:".length)), { recursive: true });
      }
      const client = createClient({ url: config.url, authToken: config.authToken });
      orm = drizzleLibsql(client, { schema: sqliteSchema });
      close = async () => client.close();
      ping = async () => void (await client.execute("SELECT 1"));
      break;
    }
    case "mysql": {
      // Store and read DATETIME values as UTC regardless of the server's time zone.
      const pool = mysql.createPool({
        uri: config.url,
        timezone: "Z",
        charset: "utf8mb4",
        connectionLimit: 5,
      });
      orm = drizzleMysql(pool, { schema: mysqlSchema, mode: "default" });
      close = () => pool.end();
      ping = async () => void (await pool.query("SELECT 1"));
      break;
    }
    case "postgres": {
      const pool = new pg.Pool({ connectionString: config.url, max: 5 });
      // An idle connection can be closed by the server (restart, failover, admin).
      // Without a listener that error would crash the process; the pool reconnects on demand.
      pool.on("error", (error) => console.error(`[database] idle connection closed: ${error.message}`));
      orm = drizzlePostgres(pool, { schema: postgresSchema });
      close = () => pool.end();
      ping = async () => void (await pool.query("SELECT 1"));
      break;
    }
  }

  return Object.assign(orm as Orm, {
    engine: config.dialect,
    t: tablesFor(config.dialect),
    config,
    ping,
    close,
  });
}

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __db?: Database };

export function getDb(): Database {
  if (!globalForDb.__db) {
    globalForDb.__db = createDatabase(resolveDatabaseConfig());
  }
  return globalForDb.__db;
}

export { describeDatabase };
