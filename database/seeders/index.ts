import { join } from "node:path";
import { createDatabase } from "@/server/db/client";
import { readEnv } from "@/server/env";
import { ensureLocalLearner } from "@/server/repositories/learners";
import { seedJapanese } from "./japanese";

async function main() {
  const env = readEnv();
  const db = createDatabase(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);
  const result = await seedJapanese(db, join(process.cwd(), "data"));
  const learner = await ensureLocalLearner(db, env.DEFAULT_LEARNER_NAME);
  console.log(
    `Seeded Japanese: ${result.items} content items, ${result.lessons} lessons. Learner: ${learner.displayName}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
