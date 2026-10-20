import { asc } from "drizzle-orm";
import type { Database } from "../db/client";
import { learners } from "../db/schema";

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
  await db
    .insert(learners)
    .values({ id: LOCAL_LEARNER_ID, displayName, targetLanguage })
    .onConflictDoNothing();
  const [learner] = await db.select().from(learners).orderBy(asc(learners.createdAt)).limit(1);
  return learner!;
}
