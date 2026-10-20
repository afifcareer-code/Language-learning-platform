import type { AttemptOutcome } from "../learning/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Scheduling state of one item+skill for one learner. */
export interface ReviewState {
  /** Scheduler-specific stage (e.g. Leitner box). 0 = still being learned. */
  stage: number;
  intervalDays: number;
  dueAt: Date;
  lastReviewedAt: Date | null;
  reviews: number;
  lapses: number;
}

/**
 * Any spaced-repetition algorithm. V0.1 ships a Leitner scheduler;
 * an SM-2 or FSRS implementation can replace it without touching callers.
 */
export interface ReviewScheduler {
  next(previous: ReviewState | null, outcome: AttemptOutcome): ReviewState;
}

/** Default Leitner intervals in days. Stage 0 re-surfaces after 10 minutes. */
export const DEFAULT_LEITNER_INTERVALS_DAYS = [10 / (24 * 60), 1, 3, 7, 14, 30, 90] as const;

/**
 * Leitner-box scheduler.
 *
 * - Correct when due: move up one box.
 * - Correct before due: no promotion, so cramming cannot fake retention.
 * - Incorrect: back to box 0, counted as a lapse if the item had progressed.
 */
export class LeitnerScheduler implements ReviewScheduler {
  constructor(private readonly intervalsDays: readonly number[] = DEFAULT_LEITNER_INTERVALS_DAYS) {
    if (intervalsDays.length < 2) throw new Error("Leitner scheduler needs at least two intervals");
  }

  next(previous: ReviewState | null, outcome: AttemptOutcome): ReviewState {
    const at = outcome.at;
    const reviews = (previous?.reviews ?? 0) + 1;

    if (!outcome.correct) {
      return this.schedule(
        0,
        at,
        reviews,
        (previous?.lapses ?? 0) + (previous && previous.stage > 0 ? 1 : 0),
      );
    }

    if (previous && at.getTime() < previous.dueAt.getTime()) {
      return { ...previous, lastReviewedAt: at, reviews };
    }

    const stage = Math.min((previous?.stage ?? 0) + 1, this.intervalsDays.length - 1);
    return this.schedule(stage, at, reviews, previous?.lapses ?? 0);
  }

  private schedule(stage: number, at: Date, reviews: number, lapses: number): ReviewState {
    const intervalDays = this.intervalsDays[stage] ?? 0;
    return {
      stage,
      intervalDays,
      dueAt: new Date(at.getTime() + intervalDays * MS_PER_DAY),
      lastReviewedAt: at,
      reviews,
      lapses,
    };
  }
}

export function isDue(state: Pick<ReviewState, "dueAt">, now: Date): boolean {
  return state.dueAt.getTime() <= now.getTime();
}

/** How far past due an item is, in multiples of its interval (0 when not overdue). */
export function overdueRatio(state: Pick<ReviewState, "dueAt" | "intervalDays">, now: Date): number {
  const overdueMs = now.getTime() - state.dueAt.getTime();
  if (overdueMs <= 0) return 0;
  const intervalMs = Math.max(state.intervalDays * MS_PER_DAY, 1);
  return overdueMs / intervalMs;
}
