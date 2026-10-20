import { asc } from "drizzle-orm";
import type { Database } from "../db/client";
import { insertIgnore } from "../db/dialect";
import type { learners } from "../db/schema/sqlite";

export type Learner = typeof learners.$inferSelect;

export const LOCAL_LEARNER_ID = "local";

/**
 * V0.1 is single-user and has no authentication: there is one local learner.
 * The schema already supports many learners for when accounts are added.
 */
export async function ensureLocalLearner(
  db: Database,
  displayName = "Learner",
  targetLanguage = "ja",
): Promise<Learner> {
  await insertIgnore(
    db,
    db,
    db.t.learners,
    { id: LOCAL_LEARNER_ID, displayName, targetLanguage },
    db.t.learners.id,
  );
  const [learner] = await db.select().from(db.t.learners).orderBy(asc(db.t.learners.createdAt)).limit(1);
  return learner!;
}
