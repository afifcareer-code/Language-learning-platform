import type { MasteryState } from "../mastery/mastery";
import { activityStatus, meetsMastery, type ActivityStatus } from "../activities/outcome";

/**
 * Three distinct progress concepts. They must never be merged into one
 * "progress" number, because they answer different questions.
 */

/** How much of the curriculum has been worked through. */
export interface CourseProgress {
  completedActivities: number;
  totalActivities: number;
  ratio: number;
}

/** How well the learner has demonstrated a skill: share of items proficient or better. */
export interface SkillMastery {
  skill: string;
  demonstrated: number;
  total: number;
  ratio: number;
}

/** Whether the learner appears ready to move past the current lesson. */
export interface LearningReadiness {
  /** Items in the current lesson at or above the readiness state, across its skills. */
  ready: number;
  total: number;
  ratio: number;
  threshold: number;
  isReady: boolean;
}

const COMPLETED: ReadonlySet<ActivityStatus> = new Set(["completed", "outcome_achieved"]);

type StateOf = (contentItemId: string, skill: string) => MasteryState;

export function courseProgress(
  activities: readonly { skill: string; contentItemIds: readonly string[]; targetMastery: MasteryState }[],
  stateOf: StateOf,
): CourseProgress {
  const completed = activities.filter((a) =>
    COMPLETED.has(activityStatus(a, (id) => stateOf(id, a.skill))),
  ).length;
  return {
    completedActivities: completed,
    totalActivities: activities.length,
    ratio: activities.length ? completed / activities.length : 0,
  };
}

export function skillMastery(
  skill: string,
  contentItemIds: readonly string[],
  stateOf: StateOf,
): SkillMastery {
  const demonstrated = contentItemIds.filter((id) => meetsMastery(stateOf(id, skill), "proficient")).length;
  return {
    skill,
    demonstrated,
    total: contentItemIds.length,
    ratio: contentItemIds.length ? demonstrated / contentItemIds.length : 0,
  };
}

export interface ReadinessPolicy {
  /** Minimum state an item must reach on each skill. */
  state: MasteryState;
  /** Share of (item, skill) pairs that must meet it. */
  threshold: number;
}

export const DEFAULT_READINESS_POLICY: ReadinessPolicy = { state: "practicing", threshold: 0.8 };

/**
 * Readiness for the next lesson: enough of the current lesson's items are at
 * least "practicing" on every skill the lesson trains.
 */
export function learningReadiness(
  contentItemIds: readonly string[],
  skills: readonly string[],
  stateOf: StateOf,
  policy: ReadinessPolicy = DEFAULT_READINESS_POLICY,
): LearningReadiness {
  return readinessOfPairs(
    contentItemIds.flatMap((itemId) => skills.map((skill) => ({ itemId, skill }))),
    stateOf,
    policy,
  );
}

/**
 * Readiness over explicit (item, skill) pairs, for lessons whose activities
 * train different items on different skills (e.g. vocabulary recall and
 * sentence building).
 */
export function readinessOfPairs(
  pairs: readonly { itemId: string; skill: string }[],
  stateOf: StateOf,
  policy: ReadinessPolicy = DEFAULT_READINESS_POLICY,
): LearningReadiness {
  const ready = pairs.filter((p) => meetsMastery(stateOf(p.itemId, p.skill), policy.state)).length;
  const total = pairs.length;
  const ratio = total ? ready / total : 0;
  return {
    ready,
    total,
    ratio,
    threshold: policy.threshold,
    isReady: total > 0 && ratio >= policy.threshold,
  };
}
