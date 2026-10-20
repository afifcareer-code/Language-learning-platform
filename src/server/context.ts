import "server-only";
import { getDb } from "./db/client";
import { readEnv } from "./env";
import { ensureLocalLearner } from "./repositories/learners";

/** Request-scoped access to the database and the current learner. */
export async function getContext() {
  const db = getDb();
  const learner = await ensureLocalLearner(db, readEnv().DEFAULT_LEARNER_NAME);
  return { db, learner };
}
