import { MASTERY_STATES, type MasteryState } from "../mastery/mastery";
import type { ActivityDefinition } from "./activity";

const RANK: Record<MasteryState, number> = {
  not_started: 0,
  learning: 1,
  needs_review: 1,
  practicing: 2,
  proficient: 3,
  mastered: 4,
};

/** True when `state` is at least as strong as `target`. */
export function meetsMastery(state: MasteryState, target: MasteryState): boolean {
  return RANK[state] >= RANK[target];
}

export type ActivityStatus = "not_started" | "in_progress" | "completed" | "outcome_achieved";

/**
 * Where a learner stands on an activity, from per-item mastery of its skill:
 * - completed: every item has been attempted at least once,
 * - outcome_achieved: every item has reached the activity's target mastery.
 */
export function activityStatus(
  activity: Pick<ActivityDefinition, "contentItemIds" | "targetMastery">,
  stateOf: (contentItemId: string) => MasteryState,
): ActivityStatus {
  const states = activity.contentItemIds.map(stateOf);
  if (states.length === 0 || states.every((s) => s === "not_started")) return "not_started";
  if (states.every((s) => meetsMastery(s, activity.targetMastery))) return "outcome_achieved";
  if (states.every((s) => s !== "not_started")) return "completed";
  return "in_progress";
}

export interface SessionResult {
  contentItemId: string;
  correct: boolean;
  before: MasteryState;
  after: MasteryState;
  nextReviewAt: Date;
}

export interface SessionOutcome {
  total: number;
  correct: number;
  score: number;
  passed: boolean;
  /** Items per mastery state after the session. */
  masteryAfter: Record<MasteryState, number>;
  improved: number;
  declined: number;
  /** Earliest next review among the session's items. */
  nextReviewAt: Date | null;
}

/** Summarise a session against the activity's pass score: the learning outcome shown to the learner. */
export function summarizeSession(results: readonly SessionResult[], passScore: number): SessionOutcome {
  // The latest result per item reflects its final state.
  const latest = new Map<string, SessionResult>();
  const first = new Map<string, SessionResult>();
  for (const r of results) {
    if (!first.has(r.contentItemId)) first.set(r.contentItemId, r);
    latest.set(r.contentItemId, r);
  }
  const correct = results.filter((r) => r.correct).length;
  const score = results.length ? correct / results.length : 0;
  const masteryAfter = Object.fromEntries(MASTERY_STATES.map((s) => [s, 0])) as Record<MasteryState, number>;
  let improved = 0;
  let declined = 0;
  for (const [id, r] of latest) {
    masteryAfter[r.after] += 1;
    const before = first.get(id)!.before;
    if (RANK[r.after] > RANK[before]) improved++;
    if (RANK[r.after] < RANK[before] || (r.after === "needs_review" && before !== "needs_review")) declined++;
  }
  const nextReviewAt = [...latest.values()].reduce<Date | null>(
    (min, r) => (min === null || r.nextReviewAt < min ? r.nextReviewAt : min),
    null,
  );
  return {
    total: results.length,
    correct,
    score,
    passed: results.length > 0 && score >= passScore,
    masteryAfter,
    improved,
    declined,
    nextReviewAt,
  };
}
