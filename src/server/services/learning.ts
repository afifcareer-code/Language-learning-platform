import { randomUUID } from "node:crypto";
import { and, eq, ne, or } from "drizzle-orm";
import {
  pairKey,
  recordConfusion,
  recordPairSuccess,
  type ConfusionPairState,
  type RemediationStatus,
} from "@/core/analytics";
import type { AttemptMode, ContentItem, ResponseEvaluation, SkillId } from "@/core/learning";
import { applyAttempt, type MasteryState } from "@/core/mastery";
import { LeitnerScheduler, type ReviewScheduler, type ReviewState } from "@/core/review";
import { getLanguageModule } from "@/languages/registry";
import type { Database, Transaction } from "../db/client";
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
  activityId?: string | null;
  /** The Practice stage this attempt trains ("<skill>.<stage>"), when it belongs to Practice. */
  practiceStage?: string | null;
  /** Another item the learner gave the answer for, e.g. a similar-looking character. */
  confusedWithItemId?: string | null;
  writingSample?: Omit<typeof writingSamples.$inferInsert, "attemptId">;
  at?: Date;
}

export interface RecordAttemptResult {
  attemptId: string;
  previousMasteryState: MasteryState;
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
      activityId: input.activityId ?? null,
      practiceStage: input.practiceStage ?? null,
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
    const previous = toMasteryRecord(masteryRow);
    const next = applyAttempt(previous, outcome, review);
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

    await updateConfusionPairs(db, tx, input, at);

    return { attemptId, previousMasteryState: previous.state, masteryState: next.state, review };
  });
}

/**
 * A confusion strengthens the pair; a correct answer on either item counts
 * toward resolving every open pair it belongs to.
 */
async function updateConfusionPairs(
  db: Database,
  tx: Transaction,
  input: RecordAttemptInput,
  at: Date,
): Promise<void> {
  const t = db.t.confusionPairs;
  const toState = (row: typeof t.$inferSelect): ConfusionPairState => ({
    ...row,
    status: row.status as RemediationStatus,
  });

  if (!input.correct && input.confusedWithItemId && input.confusedWithItemId !== input.contentItemId) {
    const [itemA, itemB] = pairKey(input.contentItemId, input.confusedWithItemId);
    const [row] = await tx
      .select()
      .from(t)
      .where(and(eq(t.learnerId, input.learnerId), eq(t.itemA, itemA), eq(t.itemB, itemB)))
      .limit(1);
    const next = recordConfusion(row ? toState(row) : null, itemA, itemB, at);
    await upsert(
      db,
      tx,
      t,
      { learnerId: input.learnerId, ...next },
      { target: [t.learnerId, t.itemA, t.itemB], set: next },
    );
    return;
  }

  if (input.correct) {
    const rows = await tx
      .select()
      .from(t)
      .where(
        and(
          eq(t.learnerId, input.learnerId),
          ne(t.status, "resolved"),
          or(eq(t.itemA, input.contentItemId), eq(t.itemB, input.contentItemId)),
        ),
      );
    for (const row of rows) {
      const next = recordPairSuccess(toState(row));
      await tx
        .update(t)
        .set({ correctSinceError: next.correctSinceError, status: next.status })
        .where(and(eq(t.learnerId, row.learnerId), eq(t.itemA, row.itemA), eq(t.itemB, row.itemB)));
    }
  }
}
