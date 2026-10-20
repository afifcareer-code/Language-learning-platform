import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { readEnv } from "../env";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;

export function createDatabase(url: string, authToken?: string): Database {
  if (url.startsWith("file:") && !url.includes(":memory:")) {
    mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
  }
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __db?: Database };

export function getDb(): Database {
  if (!globalForDb.__db) {
    const env = readEnv();
    globalForDb.__db = createDatabase(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);
  }
  return globalForDb.__db;
}
