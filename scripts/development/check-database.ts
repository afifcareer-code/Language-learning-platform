/**
 * Show which database the app will use and verify the connection.
 * Handy on hosting panels: run `npm run db:check` from the panel's terminal
 * or "Run script" feature after entering the database settings.
 */
import { loadEnvConfig } from "@next/env";
import { createDatabase, describeDatabase } from "@/server/db/client";
import { resolveDatabaseConfig } from "@/server/db/config";

async function main() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
  const config = resolveDatabaseConfig();
  console.log(`Detected: ${describeDatabase(config)}`);

  const db = createDatabase(config);
  try {
    await db.ping();
    console.log("✓ Connection OK");
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error("✗ Could not connect:", error instanceof Error ? error.message : error);
  process.exit(1);
});
