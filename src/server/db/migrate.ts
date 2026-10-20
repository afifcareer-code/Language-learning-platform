import { migrate } from "drizzle-orm/libsql/migrator";
import type { Database } from "./client";

export const MIGRATIONS_FOLDER = "database/migrations";

export async function runMigrations(db: Database, migrationsFolder = MIGRATIONS_FOLDER): Promise<void> {
  await migrate(db, { migrationsFolder });
}
