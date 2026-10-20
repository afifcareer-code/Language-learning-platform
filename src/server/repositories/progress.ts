import { and, desc, eq, gte, lte } from "drizzle-orm";
import { currentMasteryState, EMPTY_MASTERY, type MasteryRecord, type MasteryState } from "@/core/mastery";
import type { ReviewState } from "@/core/review";
import type { Database } from "../db/client";
import { learningAttempts, mastery, reviewSchedule } from "../db/schema";

export interface ItemProgress {
  contentItemId: string;
  skill: string;
  mastery: MasteryRecord;
  review: ReviewState | null;
  /** State as of now, accounting for overdue reviews. */
  state: MasteryState;
}

type MasteryRow = typeof mastery.$inferSelect;
type ReviewRow = typeof reviewSchedule.$inferSelect;

export function toMasteryRecord(row: MasteryRow | undefined | null): MasteryRecord {
  if (!row) return EMPTY_MASTERY;
  return {
    attempts: row.attempts,
    correct: row.correct,
    consecutiveCorrect: row.consecutiveCorrect,
    lastAttemptAt: row.lastAttemptAt,
    state: row.state as MasteryState,
  };
}

export function toReviewState(row: ReviewRow | undefined | null): ReviewState | null {
  if (!row) return null;
  return {
    stage: row.stage,
    intervalDays: row.intervalDays,
    dueAt: row.dueAt,
    lastReviewedAt: row.lastReviewedAt,
    reviews: row.reviews,
    lapses: row.lapses,
  };
}

/** All progress rows for a learner, keyed by `${contentItemId}|${skill}`. */
export async function getLearnerProgress(
  db: Database,
  learnerId: string,
  now = new Date(),
): Promise<Map<string, ItemProgress>> {
  const rows = await db
    .select({ mastery, review: reviewSchedule })
    .from(mastery)
    .leftJoin(
      reviewSchedule,
      and(
        eq(reviewSchedule.learnerId, mastery.learnerId),
        eq(reviewSchedule.contentItemId, mastery.contentItemId),
        eq(reviewSchedule.skill, mastery.skill),
      ),
    )
    .where(eq(mastery.learnerId, learnerId));

  const out = new Map<string, ItemProgress>();
  for (const row of rows) {
    const record = toMasteryRecord(row.mastery);
    const review = toReviewState(row.review);
    out.set(progressKey(row.mastery.contentItemId, row.mastery.skill), {
      contentItemId: row.mastery.contentItemId,
      skill: row.mastery.skill,
      mastery: record,
      review,
      state: currentMasteryState(record, review, now),
    });
  }
  return out;
}

export function progressKey(contentItemId: string, skill: string): string {
  return `${contentItemId}|${skill}`;
}

export async function getDueReviews(
  db: Database,
  learnerId: string,
  now = new Date(),
): Promise<{ contentItemId: string; skill: string; dueAt: Date }[]> {
  return db
    .select({
      contentItemId: reviewSchedule.contentItemId,
      skill: reviewSchedule.skill,
      dueAt: reviewSchedule.dueAt,
    })
    .from(reviewSchedule)
    .where(and(eq(reviewSchedule.learnerId, learnerId), lte(reviewSchedule.dueAt, now)))
    .orderBy(reviewSchedule.dueAt);
}

export async function getRecentAttempts(
  db: Database,
  learnerId: string,
  options: { since?: Date; limit?: number } = {},
) {
  const conditions = [eq(learningAttempts.learnerId, learnerId)];
  if (options.since) conditions.push(gte(learningAttempts.createdAt, options.since));
  return db
    .select({
      id: learningAttempts.id,
      contentItemId: learningAttempts.contentItemId,
      skill: learningAttempts.skill,
      mode: learningAttempts.mode,
      correct: learningAttempts.correct,
      score: learningAttempts.score,
      response: learningAttempts.response,
      createdAt: learningAttempts.createdAt,
    })
    .from(learningAttempts)
    .where(and(...conditions))
    .orderBy(desc(learningAttempts.createdAt))
    .limit(options.limit ?? 50);
}
