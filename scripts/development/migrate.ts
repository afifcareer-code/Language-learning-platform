import { loadEnvConfig } from "@next/env";
import { prepareDatabase } from "@/server/db/bootstrap";
import { getDb } from "@/server/db/client";

async function main() {
  loadEnvConfig(process.cwd());
  const db = getDb();
  await prepareDatabase(db, { migrate: true, seed: false });
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
