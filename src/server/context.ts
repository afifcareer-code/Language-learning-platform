import "server-only";
import { cache } from "react";
import { getDb } from "./db/client";
import { readEnv } from "./env";
import { ensureLocalLearner } from "./repositories/learners";

/** Request-scoped access to the database and the current learner. */
export const getContext = cache(async () => {
  const db = getDb();
  const learner = await ensureLocalLearner(db, readEnv().DEFAULT_LEARNER_NAME);
  return { db, learner };
});
