import type { SkillId } from "../learning/types";
import type { MasteryState } from "../mastery/mastery";

/**
 * Rule-based "what next?". Every recommendation carries a reason code so the
 * UI can explain, in the learner's language, why it is suggested.
 */

export interface ActivityRef {
  id: string;
  skill: SkillId;
}

export interface RecommendationInput {
  dueReviews: { skill: SkillId; count: number }[];
  /** Items with evidence that the learner is struggling. */
  weakItems: { contentItemId: string; skill: SkillId; state: MasteryState }[];
  /** Pairs of items the learner keeps mixing up. */
  confusionPairs: { itemA: string; itemB: string; errorCount: number }[];
  /** The next activity in the curriculum that is not yet completed. */
  nextActivity: ActivityRef | null;
}

export type RecommendationReason =
  "due_for_review" | "recent_mistakes" | "confused_pair" | "next_in_curriculum";

export type Recommendation =
  | { kind: "review"; skill: SkillId; count: number; reason: "due_for_review" }
  | { kind: "practice"; skill: SkillId; contentItemIds: string[]; reason: "recent_mistakes" }
  | { kind: "confusion"; itemA: string; itemB: string; errorCount: number; reason: "confused_pair" }
  | { kind: "activity"; activity: ActivityRef; reason: "next_in_curriculum" };

const WEAK_STATES: ReadonlySet<MasteryState> = new Set(["learning", "needs_review"]);

/**
 * Priority:
 * 1. Due reviews (protect retention before adding new material).
 * 2. Confused pairs (targeted discrimination practice).
 * 3. Weak items (fix errors while they are fresh).
 * 4. The next activity in the curriculum.
 */
export function recommendNext(input: RecommendationInput, limit = 4): Recommendation[] {
  const out: Recommendation[] = [];

  for (const due of [...input.dueReviews].sort((a, b) => b.count - a.count)) {
    if (due.count > 0)
      out.push({ kind: "review", skill: due.skill, count: due.count, reason: "due_for_review" });
  }

  const worstPair = [...input.confusionPairs].sort((a, b) => b.errorCount - a.errorCount)[0];
  if (worstPair) out.push({ kind: "confusion", ...worstPair, reason: "confused_pair" });

  const weakBySkill = new Map<SkillId, string[]>();
  for (const item of input.weakItems) {
    if (!WEAK_STATES.has(item.state)) continue;
    weakBySkill.set(item.skill, [...(weakBySkill.get(item.skill) ?? []), item.contentItemId]);
  }
  for (const [skill, ids] of weakBySkill) {
    out.push({ kind: "practice", skill, contentItemIds: ids, reason: "recent_mistakes" });
  }

  if (input.nextActivity)
    out.push({ kind: "activity", activity: input.nextActivity, reason: "next_in_curriculum" });

  return out.slice(0, limit);
}
