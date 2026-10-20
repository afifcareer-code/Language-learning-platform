import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { RemediationStatus } from "@/core/analytics";
import { currentMasteryState, EMPTY_MASTERY, type MasteryRecord, type MasteryState } from "@/core/mastery";
import type { ReviewState } from "@/core/review";
import type { Database } from "../db/client";
import type { mastery, reviewSchedule } from "../db/schema/sqlite";

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
    .select({ mastery: db.t.mastery, review: db.t.reviewSchedule })
    .from(db.t.mastery)
    .leftJoin(
      db.t.reviewSchedule,
      and(
        eq(db.t.reviewSchedule.learnerId, db.t.mastery.learnerId),
        eq(db.t.reviewSchedule.contentItemId, db.t.mastery.contentItemId),
        eq(db.t.reviewSchedule.skill, db.t.mastery.skill),
      ),
    )
    .where(eq(db.t.mastery.learnerId, learnerId));

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
      contentItemId: db.t.reviewSchedule.contentItemId,
      skill: db.t.reviewSchedule.skill,
      dueAt: db.t.reviewSchedule.dueAt,
    })
    .from(db.t.reviewSchedule)
    .where(and(eq(db.t.reviewSchedule.learnerId, learnerId), lte(db.t.reviewSchedule.dueAt, now)))
    .orderBy(db.t.reviewSchedule.dueAt);
}

export async function getRecentAttempts(
  db: Database,
  learnerId: string,
  options: { since?: Date; limit?: number } = {},
) {
  const conditions = [eq(db.t.learningAttempts.learnerId, learnerId)];
  if (options.since) conditions.push(gte(db.t.learningAttempts.createdAt, options.since));
  return db
    .select({
      id: db.t.learningAttempts.id,
      contentItemId: db.t.learningAttempts.contentItemId,
      skill: db.t.learningAttempts.skill,
      mode: db.t.learningAttempts.mode,
      correct: db.t.learningAttempts.correct,
      score: db.t.learningAttempts.score,
      response: db.t.learningAttempts.response,
      createdAt: db.t.learningAttempts.createdAt,
    })
    .from(db.t.learningAttempts)
    .where(and(...conditions))
    .orderBy(desc(db.t.learningAttempts.createdAt))
    .limit(options.limit ?? 50);
}

export async function getConfusionPairs(db: Database, learnerId: string) {
  const t = db.t.confusionPairs;
  const rows = await db.select().from(t).where(eq(t.learnerId, learnerId));
  return rows.map((r) => ({
    itemA: r.itemA,
    itemB: r.itemB,
    errorCount: r.errorCount,
    correctSinceError: r.correctSinceError,
    lastSeenAt: r.lastSeenAt,
    status: r.status as RemediationStatus,
  }));
}
