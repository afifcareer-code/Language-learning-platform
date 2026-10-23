import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sessionLearner } from "./auth/session";
import { getDb } from "./db/client";
import { readEnv } from "./env";
import { ensureLocalLearner, type Learner } from "./repositories/learners";

/**
 * The database and the learner for this request, or a null learner when
 * accounts are enabled and nobody is signed in (sign-in and sign-up pages).
 */
export const getContextOrNull = cache(async () => {
  const db = getDb();
  const env = readEnv();
  const learner: Learner | null =
    env.AUTH_MODE === "accounts"
      ? await sessionLearner(db)
      : await ensureLocalLearner(db, env.DEFAULT_LEARNER_NAME);
  return { db, learner };
});

/** Request-scoped access to the database and the current learner; signed-out visitors go to /login. */
export const getContext = cache(async () => {
  const { db, learner } = await getContextOrNull();
  if (!learner) redirect("/login");
  return { db, learner };
});
