/**
 * Resolves which database to use from the environment, so the app adapts to
 * whatever a hosting panel provides without code changes.
 *
 * Detection order (first match wins):
 *  1. DATABASE_URL / DB_URL with a recognised scheme
 *  2. Separate settings: DB_CONNECTION, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
 *     (cPanel, Plesk, aaPanel, Laravel-style .env)
 *  3. Platform variables: MYSQL_URL, MYSQLHOST… (Railway), POSTGRES_URL (Vercel), PGHOST… (libpq)
 *  4. Local SQLite file (development default)
 */

export const DIALECTS = ["sqlite", "mysql", "postgres"] as const;
export type Dialect = (typeof DIALECTS)[number];

export interface DatabaseConfig {
  dialect: Dialect;
  url: string;
  /** libSQL remote auth token (sqlite dialect only). */
  authToken?: string;
  /** Where the settings came from, for logging. Never contains secrets. */
  source: string;
}

export const DEFAULT_SQLITE_URL = "file:./.data/app.db";

type Env = Record<string, string | undefined>;

const SCHEME_DIALECT: Record<string, Dialect> = {
  "mysql:": "mysql",
  "mariadb:": "mysql",
  "postgres:": "postgres",
  "postgresql:": "postgres",
  "file:": "sqlite",
  "libsql:": "sqlite",
  "http:": "sqlite",
  "https:": "sqlite",
  "ws:": "sqlite",
  "wss:": "sqlite",
};

const CONNECTION_ALIASES: Record<string, Dialect> = {
  mysql: "mysql",
  mariadb: "mysql",
  pgsql: "postgres",
  postgres: "postgres",
  postgresql: "postgres",
  pg: "postgres",
  sqlite: "sqlite",
  libsql: "sqlite",
  turso: "sqlite",
};

const DEFAULT_PORT: Record<Exclude<Dialect, "sqlite">, string> = { mysql: "3306", postgres: "5432" };

function value(env: Env, ...names: string[]): string | undefined {
  for (const name of names) {
    const v = env[name]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function dialectFromUrl(url: string): Dialect | null {
  if (url === ":memory:") return "sqlite";
  const match = /^([a-z][a-z0-9+.-]*:)/i.exec(url);
  if (!match) return null;
  // Accept driver suffixes such as "mysql+pymysql:" or "postgresql+asyncpg:".
  const scheme = match[1]!.toLowerCase().replace(/\+[^:]*:$/, ":");
  return SCHEME_DIALECT[scheme] ?? null;
}

function normaliseUrl(dialect: Dialect, url: string): string {
  // Drivers expect their canonical scheme.
  if (dialect === "mysql") return url.replace(/^[a-z][a-z0-9+.-]*:/i, "mysql:");
  if (dialect === "postgres") return url.replace(/^[a-z][a-z0-9+.-]*:/i, "postgres:");
  return url;
}

function buildUrl(
  dialect: Exclude<Dialect, "sqlite">,
  parts: { host: string; port?: string; database: string; user?: string; password?: string },
): string {
  const auth = parts.user
    ? `${encodeURIComponent(parts.user)}${parts.password ? `:${encodeURIComponent(parts.password)}` : ""}@`
    : "";
  const host = parts.host.includes(":") && !parts.host.startsWith("[") ? `[${parts.host}]` : parts.host;
  const port = parts.port ?? DEFAULT_PORT[dialect];
  return `${dialect}://${auth}${host}:${port}/${encodeURIComponent(parts.database)}`;
}

function resolveConnection(raw: string | undefined): Dialect | undefined {
  if (!raw) return undefined;
  const dialect = CONNECTION_ALIASES[raw.toLowerCase()];
  if (!dialect) {
    throw new Error(
      `Unsupported DB_CONNECTION "${raw}". Use one of: mysql, mariadb, pgsql, postgres, sqlite.`,
    );
  }
  return dialect;
}

export function resolveDatabaseConfig(env: Env = process.env): DatabaseConfig {
  const authToken = value(env, "DATABASE_AUTH_TOKEN", "TURSO_AUTH_TOKEN");
  const explicit = resolveConnection(value(env, "DB_CONNECTION", "DB_DIALECT", "DATABASE_DIALECT"));

  // 1. A full connection URL.
  const urlName = ["DATABASE_URL", "DB_URL"].find((n) => value(env, n));
  if (urlName) {
    const url = value(env, urlName)!;
    const dialect = dialectFromUrl(url) ?? explicit;
    if (!dialect)
      throw new Error(
        `Cannot tell which database ${urlName} points to. Use a mysql://, postgres:// or file: URL.`,
      );
    return {
      dialect,
      url: normaliseUrl(dialect, url),
      authToken: dialect === "sqlite" ? authToken : undefined,
      source: urlName,
    };
  }

  // 2. Separate settings, as most hosting panels show them.
  const host = value(env, "DB_HOST", "DB_HOSTNAME", "DATABASE_HOST");
  const database = value(env, "DB_DATABASE", "DB_NAME", "DATABASE_NAME");
  if (explicit === "sqlite") {
    return {
      dialect: "sqlite",
      url: database ? `file:${database}` : DEFAULT_SQLITE_URL,
      authToken,
      source: "DB_CONNECTION",
    };
  }
  if (host || explicit) {
    if (!host || !database) {
      throw new Error("Database settings are incomplete: DB_HOST and DB_DATABASE (or DB_NAME) are required.");
    }
    const port = value(env, "DB_PORT", "DATABASE_PORT");
    // Without DB_CONNECTION, infer from the port; MySQL is the common hosting-panel default.
    const dialect: Exclude<Dialect, "sqlite"> =
      explicit ?? (port === DEFAULT_PORT.postgres ? "postgres" : "mysql");
    return {
      dialect,
      url: buildUrl(dialect, {
        host,
        port,
        database,
        user: value(env, "DB_USERNAME", "DB_USER", "DATABASE_USER"),
        password: value(env, "DB_PASSWORD", "DB_PASS", "DATABASE_PASSWORD"),
      }),
      source: "DB_* variables",
    };
  }

  // 3. Platform-provided variables.
  const platformUrl = ["MYSQL_URL", "MYSQL_PUBLIC_URL", "POSTGRES_URL", "POSTGRESQL_URL"].find((n) =>
    value(env, n),
  );
  if (platformUrl) {
    const url = value(env, platformUrl)!;
    const dialect = dialectFromUrl(url) ?? (platformUrl.startsWith("MYSQL") ? "mysql" : "postgres");
    return { dialect, url: normaliseUrl(dialect, url), source: platformUrl };
  }
  if (value(env, "MYSQLHOST") && value(env, "MYSQLDATABASE")) {
    return {
      dialect: "mysql",
      url: buildUrl("mysql", {
        host: value(env, "MYSQLHOST")!,
        port: value(env, "MYSQLPORT"),
        database: value(env, "MYSQLDATABASE")!,
        user: value(env, "MYSQLUSER"),
        password: value(env, "MYSQLPASSWORD"),
      }),
      source: "MYSQL* variables",
    };
  }
  if (value(env, "PGHOST") && value(env, "PGDATABASE")) {
    return {
      dialect: "postgres",
      url: buildUrl("postgres", {
        host: value(env, "PGHOST")!,
        port: value(env, "PGPORT"),
        database: value(env, "PGDATABASE")!,
        user: value(env, "PGUSER"),
        password: value(env, "PGPASSWORD"),
      }),
      source: "PG* variables",
    };
  }

  // 4. Local development default.
  return { dialect: "sqlite", url: DEFAULT_SQLITE_URL, authToken, source: "default" };
}

/** A loggable description of the connection with the password removed. */
export function describeDatabase(config: DatabaseConfig): string {
  if (config.dialect === "sqlite") return `sqlite (${config.url}) via ${config.source}`;
  try {
    const u = new URL(config.url);
    return `${config.dialect} ${u.hostname}:${u.port}${u.pathname} as ${decodeURIComponent(u.username) || "(no user)"} via ${config.source}`;
  } catch {
    return `${config.dialect} via ${config.source}`;
  }
}
