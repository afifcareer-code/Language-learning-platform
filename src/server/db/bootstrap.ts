import { join } from "node:path";
import { ensureAdminAccount, MIN_PASSWORD_LENGTH } from "../auth/accounts";
import { readEnv } from "../env";
import { ensureLocalLearner } from "../repositories/learners";
import { seedJapanese } from "../seed/japanese";
import { seedLanguageCatalog } from "../seed/languages";
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
      const dataDir = options.dataDir ?? join(process.cwd(), "data");
      const catalog = await seedLanguageCatalog(db, dataDir);
      const result = await seedJapanese(db, dataDir);
      await ensureLocalLearner(db, env.DEFAULT_LEARNER_NAME);
      log(
        `Content loaded: ${catalog.languages} languages in catalog; Japanese: ${result.items} items, ${result.lessons} lessons, ${result.activities} activities`,
      );
    }
    // The admin's learner needs the language catalog, which the seed step loads.
    const catalogReady = (await db.select().from(db.t.languages).limit(1)).length > 0;
    if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD && catalogReady) {
      if (env.ADMIN_PASSWORD.length < MIN_PASSWORD_LENGTH)
        log(`ADMIN_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters: admin account not created`);
      else {
        const outcome = await ensureAdminAccount(db, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
        log(
          outcome === "created"
            ? "Admin account created from ADMIN_EMAIL. You can now remove ADMIN_PASSWORD."
            : outcome === "promoted"
              ? "Existing account for ADMIN_EMAIL is now an admin (its password was not changed)."
              : "Admin account already present.",
        );
      }
    }
  });
}
