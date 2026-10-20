import type { AttemptOutcome } from "../learning/types";
import { overdueRatio, type ReviewState } from "../review/scheduler";

export const MASTERY_STATES = [
  "not_started",
  "learning",
  "practicing",
  "proficient",
  "mastered",
  "needs_review",
] as const;
export type MasteryState = (typeof MASTERY_STATES)[number];

/** Evidence accumulated for one item+skill. Never derived from lesson completion. */
export interface MasteryRecord {
  attempts: number;
  correct: number;
  consecutiveCorrect: number;
  lastAttemptAt: Date | null;
  state: MasteryState;
}

export interface MasteryPolicy {
  /** Correct answers in a row needed to leave "learning". */
  practicingStreak: number;
  proficientStreak: number;
  /** Proficiency requires the item to have survived a gap of at least this many days. */
  proficientIntervalDays: number;
  masteredStreak: number;
  masteredIntervalDays: number;
  /** An established item overdue by this multiple of its interval needs review. */
  overdueRatioForReview: number;
}

export const DEFAULT_MASTERY_POLICY: MasteryPolicy = {
  practicingStreak: 2,
  proficientStreak: 3,
  proficientIntervalDays: 3,
  masteredStreak: 5,
  masteredIntervalDays: 14,
  overdueRatioForReview: 1,
};

export const EMPTY_MASTERY: MasteryRecord = {
  attempts: 0,
  correct: 0,
  consecutiveCorrect: 0,
  lastAttemptAt: null,
  state: "not_started",
};

const ESTABLISHED: ReadonlySet<MasteryState> = new Set(["proficient", "mastered", "needs_review"]);

/**
 * Derive a mastery state from the evidence and the review schedule.
 *
 * Retention is represented by the review interval the item has reached:
 * the scheduler only promotes items answered correctly when due, so a long
 * interval means the learner recalled it after a real gap.
 */
export function deriveMasteryState(
  record: Omit<MasteryRecord, "state">,
  review: Pick<ReviewState, "intervalDays" | "dueAt"> | null,
  previousState: MasteryState,
  now: Date,
  policy: MasteryPolicy = DEFAULT_MASTERY_POLICY,
): MasteryState {
  if (record.attempts === 0) return "not_started";

  const interval = review?.intervalDays ?? 0;
  const wasEstablished = ESTABLISHED.has(previousState);

  if (wasEstablished && record.consecutiveCorrect === 0) return "needs_review";
  if (wasEstablished && review && overdueRatio(review, now) >= policy.overdueRatioForReview)
    return "needs_review";

  if (record.consecutiveCorrect >= policy.masteredStreak && interval >= policy.masteredIntervalDays)
    return "mastered";
  if (record.consecutiveCorrect >= policy.proficientStreak && interval >= policy.proficientIntervalDays)
    return "proficient";
  if (record.consecutiveCorrect >= policy.practicingStreak) return "practicing";
  return "learning";
}

/** Fold one attempt into the evidence and recompute the state. */
export function applyAttempt(
  previous: MasteryRecord,
  outcome: AttemptOutcome,
  review: Pick<ReviewState, "intervalDays" | "dueAt"> | null,
  policy: MasteryPolicy = DEFAULT_MASTERY_POLICY,
): MasteryRecord {
  const next = {
    attempts: previous.attempts + 1,
    correct: previous.correct + (outcome.correct ? 1 : 0),
    consecutiveCorrect: outcome.correct ? previous.consecutiveCorrect + 1 : 0,
    lastAttemptAt: outcome.at,
  };
  return { ...next, state: deriveMasteryState(next, review, previous.state, outcome.at, policy) };
}

export function accuracy(record: Pick<MasteryRecord, "attempts" | "correct">): number | null {
  return record.attempts === 0 ? null : record.correct / record.attempts;
}

/** The state to display now: established items decay to "needs_review" when overdue. */
export function currentMasteryState(
  record: MasteryRecord,
  review: Pick<ReviewState, "intervalDays" | "dueAt"> | null,
  now: Date,
  policy: MasteryPolicy = DEFAULT_MASTERY_POLICY,
): MasteryState {
  return deriveMasteryState(record, review, record.state, now, policy);
}
