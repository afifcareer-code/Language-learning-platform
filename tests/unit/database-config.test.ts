import { describe, expect, it } from "vitest";
import {
  DEFAULT_SQLITE_URL,
  describeDatabase,
  dialectFromUrl,
  resolveDatabaseConfig,
} from "@/server/db/config";

describe("dialectFromUrl", () => {
  it.each([
    ["mysql://u:p@h/db", "mysql"],
    ["mariadb://u:p@h/db", "mysql"],
    ["mysql+pymysql://u@h/db", "mysql"],
    ["postgres://u@h/db", "postgres"],
    ["postgresql://u@h/db", "postgres"],
    ["file:./x.db", "sqlite"],
    ["libsql://x.turso.io", "sqlite"],
    [":memory:", "sqlite"],
    ["nonsense", null],
  ])("%s → %s", (url, dialect) => {
    expect(dialectFromUrl(url)).toBe(dialect);
  });
});

describe("resolveDatabaseConfig", () => {
  it("defaults to a local SQLite file", () => {
    expect(resolveDatabaseConfig({})).toMatchObject({
      dialect: "sqlite",
      url: DEFAULT_SQLITE_URL,
      source: "default",
    });
  });

  it("uses DATABASE_URL and normalises driver schemes", () => {
    expect(resolveDatabaseConfig({ DATABASE_URL: "mariadb://u:p@db.example.com:3307/app" })).toMatchObject({
      dialect: "mysql",
      url: "mysql://u:p@db.example.com:3307/app",
    });
    expect(
      resolveDatabaseConfig({ DATABASE_URL: "postgresql://u@h:5432/app?sslmode=require" }),
    ).toMatchObject({
      dialect: "postgres",
      url: "postgres://u@h:5432/app?sslmode=require",
    });
  });

  it("builds a MySQL URL from hosting-panel DB_* settings, encoding credentials", () => {
    const config = resolveDatabaseConfig({
      DB_CONNECTION: "mysql",
      DB_HOST: "localhost",
      DB_DATABASE: "cpuser_llp",
      DB_USERNAME: "cpuser_app",
      DB_PASSWORD: "p@ss:w/rd#1",
    });
    expect(config).toMatchObject({ dialect: "mysql", source: "DB_* variables" });
    const url = new URL(config.url);
    expect(url.port).toBe("3306");
    expect(url.pathname).toBe("/cpuser_llp");
    expect(decodeURIComponent(url.username)).toBe("cpuser_app");
    expect(decodeURIComponent(url.password)).toBe("p@ss:w/rd#1");
  });

  it("assumes MySQL for DB_HOST without DB_CONNECTION, unless the port is PostgreSQL's", () => {
    const base = { DB_HOST: "127.0.0.1", DB_NAME: "app", DB_USER: "u", DB_PASS: "p" };
    expect(resolveDatabaseConfig(base).dialect).toBe("mysql");
    expect(resolveDatabaseConfig({ ...base, DB_PORT: "5432" }).dialect).toBe("postgres");
  });

  it("accepts Laravel connection names", () => {
    const base = { DB_HOST: "h", DB_DATABASE: "d" };
    expect(resolveDatabaseConfig({ ...base, DB_CONNECTION: "pgsql" }).url).toBe("postgres://h:5432/d");
    expect(resolveDatabaseConfig({ ...base, DB_CONNECTION: "mariadb" }).url).toBe("mysql://h:3306/d");
    expect(resolveDatabaseConfig({ DB_CONNECTION: "sqlite", DB_DATABASE: "./data.db" }).url).toBe(
      "file:./data.db",
    );
  });

  it("detects platform variables (Railway, Vercel, libpq)", () => {
    expect(resolveDatabaseConfig({ MYSQL_URL: "mysql://u:p@h:1/d" }).dialect).toBe("mysql");
    expect(resolveDatabaseConfig({ POSTGRES_URL: "postgres://u@h/d" }).dialect).toBe("postgres");
    expect(
      resolveDatabaseConfig({
        MYSQLHOST: "h",
        MYSQLPORT: "9",
        MYSQLDATABASE: "d",
        MYSQLUSER: "u",
        MYSQLPASSWORD: "p",
      }).url,
    ).toBe("mysql://u:p@h:9/d");
    expect(resolveDatabaseConfig({ PGHOST: "h", PGDATABASE: "d", PGUSER: "u" }).url).toBe(
      "postgres://u@h:5432/d",
    );
  });

  it("prefers DATABASE_URL over separate settings", () => {
    expect(
      resolveDatabaseConfig({ DATABASE_URL: "postgres://h/d", DB_HOST: "other", DB_DATABASE: "x" }).dialect,
    ).toBe("postgres");
  });

  it("explains incomplete or unsupported settings", () => {
    expect(() => resolveDatabaseConfig({ DB_HOST: "h" })).toThrow(/DB_DATABASE/);
    expect(() => resolveDatabaseConfig({ DB_CONNECTION: "oracle", DB_HOST: "h", DB_DATABASE: "d" })).toThrow(
      /Unsupported/,
    );
  });

  it("never includes the password in descriptions", () => {
    const config = resolveDatabaseConfig({ DATABASE_URL: "mysql://user:secret@h:3306/db" });
    expect(describeDatabase(config)).not.toContain("secret");
    expect(describeDatabase(config)).toContain("mysql h:3306/db as user");
  });
});
