import { join } from "node:path";
import { readEnv } from "../env";
import { ensureLocalLearner } from "../repositories/learners";
import { seedJapanese } from "../seed/japanese";
import { describeDatabase, getDb, type Database } from "./client";
import { runMigrations, withMigrationLock } from "./migrate";

export interface PrepareOptions {
  migrate?: boolean;
  seed?: boolean;
  dataDir?: string;
  log?: (message: string) => void;
}

/**
 * Bring the database up to date: apply migrations, load bundled content and
 * make sure the local learner exists. Safe to run on every start and from
 * several processes at once.
 */
export async function prepareDatabase(db: Database = getDb(), options: PrepareOptions = {}): Promise<void> {
  const env = readEnv();
  const migrate = options.migrate ?? env.AUTO_MIGRATE;
  const seed = options.seed ?? env.AUTO_SEED;
  const log = options.log ?? ((message: string) => console.log(`[database] ${message}`));

  log(`Using ${describeDatabase(db.config)}`);
  await withMigrationLock(db.config, async () => {
    if (migrate) {
      await runMigrations(db);
      log("Migrations up to date");
    }
    if (seed) {
      const result = await seedJapanese(db, options.dataDir ?? join(process.cwd(), "data"));
      await ensureLocalLearner(db, env.DEFAULT_LEARNER_NAME);
      log(
        `Content loaded: ${result.items} items, ${result.lessons} lessons, ${result.activities} activities`,
      );
    }
  });
}
