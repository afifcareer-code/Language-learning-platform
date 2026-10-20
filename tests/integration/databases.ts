import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mysql from "mysql2/promise";
import pg from "pg";
import { dialectFromUrl, type DatabaseConfig, type Dialect } from "@/server/db/config";

/**
 * Test databases. SQLite always runs; MySQL and PostgreSQL run when a server
 * URL is provided (the user needs permission to create databases):
 *
 *   TEST_MYSQL_URL=mysql://user:pass@127.0.0.1:3306/ TEST_POSTGRES_URL=postgres://user@127.0.0.1:5432/postgres npm test
 */
export interface TestDatabase {
  config: DatabaseConfig;
  drop(): Promise<void>;
}

export const TEST_DIALECTS: { dialect: Dialect; serverUrl?: string }[] = [
  { dialect: "sqlite" },
  ...(process.env.TEST_MYSQL_URL
    ? [{ dialect: "mysql" as const, serverUrl: process.env.TEST_MYSQL_URL }]
    : []),
  ...(process.env.TEST_POSTGRES_URL
    ? [{ dialect: "postgres" as const, serverUrl: process.env.TEST_POSTGRES_URL }]
    : []),
];

export async function createTestDatabase(dialect: Dialect, serverUrl?: string): Promise<TestDatabase> {
  if (dialect === "sqlite") {
    const dir = mkdtempSync(join(tmpdir(), "llp-test-"));
    return {
      config: { dialect, url: `file:${join(dir, "test.db")}`, source: "test" },
      drop: async () => rmSync(dir, { recursive: true, force: true }),
    };
  }
  if (!serverUrl || dialectFromUrl(serverUrl) !== dialect)
    throw new Error(`A ${dialect} server URL is required`);
  const name = `llp_test_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const url = new URL(serverUrl);

  if (dialect === "mysql") {
    // Deliberately leave the server's default charset alone: migrations must set utf8mb4 themselves.
    const admin = await mysql.createConnection({ uri: serverUrl });
    await admin.query(`CREATE DATABASE \`${name}\``);
    await admin.end();
    url.pathname = `/${name}`;
    return {
      config: { dialect, url: url.toString(), source: "test" },
      drop: async () => {
        const c = await mysql.createConnection({ uri: serverUrl });
        await c.query(`DROP DATABASE IF EXISTS \`${name}\``);
        await c.end();
      },
    };
  }

  const admin = new pg.Client({ connectionString: serverUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  url.pathname = `/${name}`;
  return {
    config: { dialect, url: url.toString(), source: "test" },
    drop: async () => {
      const c = new pg.Client({ connectionString: serverUrl });
      await c.connect();
      // Closed pools may still be finishing their disconnects; wait for them
      // rather than force-terminating sessions that are already going away.
      for (let i = 0; i < 50; i++) {
        const { rows } = await c.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = $1", [
          name,
        ]);
        if (rows[0].n === 0) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await c.end();
    },
  };
}
