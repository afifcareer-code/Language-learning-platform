import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { AttemptMode, ContentItem, ResponseEvaluation, SkillId } from "@/core/learning";
import { applyAttempt, type MasteryState } from "@/core/mastery";
import { LeitnerScheduler, type ReviewScheduler, type ReviewState } from "@/core/review";
import { getLanguageModule } from "@/languages/registry";
import type { Database } from "../db/client";
import { upsert } from "../db/dialect";
import type { writingSamples } from "../db/schema/sqlite";
import { toMasteryRecord, toReviewState } from "../repositories/progress";

export interface RecordAttemptInput {
  learnerId: string;
  contentItemId: string;
  skill: SkillId;
  mode: AttemptMode;
  correct: boolean;
  score: number;
  response?: string | null;
  responseMs?: number | null;
  writingSample?: Omit<typeof writingSamples.$inferInsert, "attemptId">;
  at?: Date;
}

export interface RecordAttemptResult {
  attemptId: string;
  masteryState: MasteryState;
  review: ReviewState;
}

const defaultScheduler = new LeitnerScheduler();

/** Grade a typed response using the item's language module. */
export function evaluateTypedResponse(
  item: ContentItem,
  skill: SkillId,
  response: string,
): ResponseEvaluation | null {
  return getLanguageModule(item.languageCode).evaluateResponse(item, skill, response);
}

/**
 * Persist an attempt and update the review schedule and mastery in one
 * transaction. This is the single write path for learning evidence.
 */
export async function recordAttempt(
  db: Database,
  input: RecordAttemptInput,
  scheduler: ReviewScheduler = defaultScheduler,
): Promise<RecordAttemptResult> {
  const at = input.at ?? new Date();
  const outcome = { correct: input.correct, score: input.score, at };
  const key = { learnerId: input.learnerId, contentItemId: input.contentItemId, skill: input.skill };
  const where = (t: typeof mastery | typeof reviewSchedule) =>
    and(eq(t.learnerId, key.learnerId), eq(t.contentItemId, key.contentItemId), eq(t.skill, key.skill));

  const { learningAttempts, mastery, reviewSchedule, writingSamples } = db.t;

  return db.transaction(async (tx) => {
    const attemptId = randomUUID();
    await tx.insert(learningAttempts).values({
      id: attemptId,
      ...key,
      mode: input.mode,
      correct: input.correct,
      score: input.score,
      response: input.response ?? null,
      responseMs: input.responseMs ?? null,
      createdAt: at,
    });
    if (input.writingSample) {
      await tx.insert(writingSamples).values({ attemptId, ...input.writingSample });
    }

    const [reviewRow] = await tx.select().from(reviewSchedule).where(where(reviewSchedule)).limit(1);
    const review = scheduler.next(toReviewState(reviewRow), outcome);
    await upsert(
      db,
      tx,
      reviewSchedule,
      { ...key, ...review },
      {
        target: [reviewSchedule.learnerId, reviewSchedule.contentItemId, reviewSchedule.skill],
        set: review,
      },
    );

    const [masteryRow] = await tx.select().from(mastery).where(where(mastery)).limit(1);
    const next = applyAttempt(toMasteryRecord(masteryRow), outcome, review);
    await upsert(
      db,
      tx,
      mastery,
      { ...key, ...next },
      {
        target: [mastery.learnerId, mastery.contentItemId, mastery.skill],
        set: next,
      },
    );

    return { attemptId, masteryState: next.state, review };
  });
}
