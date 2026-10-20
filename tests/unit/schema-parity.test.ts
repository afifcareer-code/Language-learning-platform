import { readdirSync, readFileSync } from "node:fs";
import { getTableConfig as mysqlTableConfig, type MySqlTable } from "drizzle-orm/mysql-core";
import { getTableConfig as pgTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { getTableConfig as sqliteTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { mysqlSchema, postgresSchema, sqliteSchema } from "@/server/db/schema";

function shape(configs: { name: string; columns: { name: string; notNull: boolean; primary: boolean }[] }[]) {
  return Object.fromEntries(
    configs.map((t) => [
      t.name,
      t.columns.map((c) => `${c.name}${c.notNull ? "!" : ""}${c.primary ? "*" : ""}`).sort(),
    ]),
  );
}

describe("database schemas", () => {
  const sqlite = shape(Object.values(sqliteSchema).map((t) => sqliteTableConfig(t as SQLiteTable)));
  const mysql = shape(Object.values(mysqlSchema).map((t) => mysqlTableConfig(t as MySqlTable)));
  const postgres = shape(Object.values(postgresSchema).map((t) => pgTableConfig(t as PgTable)));

  it("have the same tables, columns and nullability on every dialect", () => {
    expect(mysql).toEqual(sqlite);
    expect(postgres).toEqual(sqlite);
  });

  it("export tables under the same names", () => {
    expect(Object.keys(mysqlSchema).sort()).toEqual(Object.keys(sqliteSchema).sort());
    expect(Object.keys(postgresSchema).sort()).toEqual(Object.keys(sqliteSchema).sort());
  });

  it.each(readdirSync("database/migrations/mysql").filter((f) => f.endsWith(".sql")))(
    "creates MySQL tables as utf8mb4 in %s, so Japanese text is stored safely",
    (file) => {
      const sql = readFileSync(`database/migrations/mysql/${file}`, "utf8");
      const tables = sql.match(/CREATE TABLE `[a-z_]+`/g) ?? [];
      expect(sql.match(/DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;/g) ?? []).toHaveLength(tables.length);
    },
  );
});
