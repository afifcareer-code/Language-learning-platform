import { getTableColumns, getTableName, type Table } from "drizzle-orm";
import type { Database } from "../db/client";
import { ArchiveError, readTarGz, writeTarGz } from "./tar";

/**
 * Backup and restore of everything in the database except sign-in sessions.
 * The archive is a .tar.gz holding one data.json. It is dialect-neutral, so a backup made on
 * MySQL restores on PostgreSQL (and back). Bundled content (lessons, kanji…) is included too,
 * although the next start reloads it from the files in the repo anyway.
 */
export const BACKUP_FORMAT = "language-learning-platform-backup";
export const BACKUP_VERSION = 1;
export const IMPORT_CONFIRMATION = "IMPOR";

/** Tables in insert order (parents before children). account_sessions is never exported. */
const TABLES = [
  "languages",
  "levels",
  "levelTranslations",
  "courses",
  "courseTranslations",
  "contentItems",
  "contentItemTranslations",
  "lessons",
  "lessonTranslations",
  "lessonItems",
  "activities",
  "activityItems",
  "activityTranslations",
  "assessments",
  "learners",
  "learnerLanguages",
  "learningSessions",
  "learningAttempts",
  "writingSamples",
  "mastery",
  "reviewSchedule",
  "confusionPairs",
  "assessmentAttempts",
  "assessmentResults",
  "accounts",
] as const;
type TableKey = (typeof TABLES)[number];

export interface BackupData {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  dialect: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export class BackupError extends Error {
  constructor(
    readonly code: "archive" | "missing_data" | "format" | "version" | "tables" | "columns" | "confirmation",
    message: string,
  ) {
    super(message);
  }
}

const tableOf = (db: Database, key: TableKey) => (db.t as unknown as Record<TableKey, Table>)[key];

export async function exportData(db: Database, now = new Date()): Promise<BackupData> {
  const tables: BackupData["tables"] = {};
  for (const key of TABLES) {
    const rows = (await db.select().from(tableOf(db, key) as never)) as Record<string, unknown>[];
    tables[key] = rows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])),
    );
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    dialect: db.config.dialect,
    tables,
  };
}

export async function exportArchive(db: Database, now = new Date()): Promise<Buffer> {
  const data = await exportData(db, now);
  return writeTarGz([{ name: "data.json", data: Buffer.from(JSON.stringify(data)) }], now);
}

/** Check that the archive is ours and fits this schema; nothing is written. */
export function parseArchive(db: Database, archive: Buffer): BackupData {
  let files: Map<string, Buffer>;
  try {
    files = readTarGz(archive);
  } catch (e) {
    throw new BackupError("archive", e instanceof ArchiveError ? e.message : "unreadable archive");
  }
  const raw = files.get("data.json");
  if (!raw) throw new BackupError("missing_data", "data.json is missing from the archive");
  let data: BackupData;
  try {
    data = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new BackupError("format", "data.json is not valid JSON");
  }
  if (!data || typeof data !== "object" || data.format !== BACKUP_FORMAT || typeof data.tables !== "object")
    throw new BackupError("format", "not a backup of this app");
  if (data.version !== BACKUP_VERSION)
    throw new BackupError("version", `unsupported backup version ${data.version}`);
  const names = Object.keys(data.tables).sort();
  if (names.join() !== [...TABLES].sort().join())
    throw new BackupError("tables", "the backup does not contain the expected tables");
  for (const key of TABLES) {
    const rows = data.tables[key];
    if (!Array.isArray(rows)) throw new BackupError("tables", `${key} is not a list`);
    const columns = new Set(Object.keys(getTableColumns(tableOf(db, key))));
    for (const row of rows) {
      if (!row || typeof row !== "object") throw new BackupError("columns", `${key}: a row is not an object`);
      for (const c of Object.keys(row))
        if (!columns.has(c)) throw new BackupError("columns", `${key}: unknown column ${c}`);
    }
  }
  return data;
}

/**
 * Replace ALL data (and end every sign-in session) with the backup, in one transaction:
 * if anything fails, nothing changes. `confirmation` must be exactly "IMPOR".
 */
export async function importArchive(
  db: Database,
  archive: Buffer,
  confirmation: string,
): Promise<{ rows: number }> {
  if (confirmation !== IMPORT_CONFIRMATION)
    throw new BackupError("confirmation", `type ${IMPORT_CONFIRMATION} to confirm`);
  const data = parseArchive(db, archive);
  let total = 0;
  await db.transaction(async (tx) => {
    await tx.delete(db.t.accountSessions);
    for (const key of [...TABLES].reverse()) await tx.delete(tableOf(db, key) as never);
    for (const key of TABLES) {
      const table = tableOf(db, key);
      const columns = getTableColumns(table);
      const rows = data.tables[key]!.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [
            k,
            columns[k]!.dataType === "date" && typeof v === "string" ? new Date(v) : v,
          ]),
        ),
      );
      for (let i = 0; i < rows.length; i += 200)
        await tx.insert(table as never).values(rows.slice(i, i + 200) as never);
      total += rows.length;
    }
  });
  return { rows: total };
}

export const backupTableNames = (db: Database) => TABLES.map((k) => getTableName(tableOf(db, k)));
