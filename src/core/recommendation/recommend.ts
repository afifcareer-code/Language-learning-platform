import type { MasteryState } from "../mastery/mastery";
import type { SkillId } from "../learning/types";

export interface LessonRef {
  id: string;
  slug: string;
  title: string;
}

export interface RecommendationInput {
  dueReviews: { skill: SkillId; count: number }[];
  /** Items with evidence that the learner is struggling. */
  weakItems: { contentItemId: string; skill: SkillId; state: MasteryState }[];
  /** The first lesson whose items are not yet practised, if any. */
  nextLesson: LessonRef | null;
}

export type Recommendation =
  | { kind: "review"; skill: SkillId; count: number; reason: string }
  | { kind: "practice"; skill: SkillId; contentItemIds: string[]; reason: string }
  | { kind: "learn"; lesson: LessonRef; reason: string };

const WEAK_STATES: ReadonlySet<MasteryState> = new Set(["learning", "needs_review"]);

/**
 * Rule-based "what next?". Order of priority:
 * 1. Due reviews (protect retention before adding new material).
 * 2. Weak items (fix errors while they are fresh).
 * 3. The next lesson.
 */
export function recommendNext(input: RecommendationInput, limit = 3): Recommendation[] {
  const out: Recommendation[] = [];

  for (const due of [...input.dueReviews].sort((a, b) => b.count - a.count)) {
    if (due.count > 0) {
      out.push({ kind: "review", skill: due.skill, count: due.count, reason: "Due for review" });
    }
  }

  const weakBySkill = new Map<SkillId, string[]>();
  for (const item of input.weakItems) {
    if (!WEAK_STATES.has(item.state)) continue;
    weakBySkill.set(item.skill, [...(weakBySkill.get(item.skill) ?? []), item.contentItemId]);
  }
  for (const [skill, ids] of weakBySkill) {
    out.push({ kind: "practice", skill, contentItemIds: ids, reason: "Needs more practice" });
  }

  if (input.nextLesson) {
    out.push({ kind: "learn", lesson: input.nextLesson, reason: "Next in your curriculum" });
  }

  return out.slice(0, limit);
}
