import { createDatabase } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { readEnv } from "@/server/env";

async function main() {
  const env = readEnv();
  await runMigrations(createDatabase(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN));
  console.log(`Migrations applied to ${env.DATABASE_URL}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
