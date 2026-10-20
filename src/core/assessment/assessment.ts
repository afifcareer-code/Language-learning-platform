import type { LanguageCode, SkillId } from "../learning/types";

/** What an assessment measures and how it selects items. Authored once, reused. */
export interface AssessmentDefinition {
  id: string;
  languageCode: LanguageCode;
  slug: string;
  title: string;
  skill: SkillId;
  /** Content selection: all items of this type, optionally narrowed by tag. */
  selector: { contentType: string; tags?: readonly string[] };
  questionCount: number;
  /** Fraction of correct answers needed to pass, in [0, 1]. */
  passThreshold: number;
}

/** One sitting of an assessment by a learner. */
export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  learnerId: string;
  startedAt: Date;
  completedAt: Date | null;
}

export interface AssessmentResponse {
  contentItemId: string;
  correct: boolean;
}

/** The scored outcome of a completed attempt. */
export interface AssessmentResult {
  total: number;
  correct: number;
  score: number;
  passed: boolean;
  /** Items answered incorrectly; candidates for targeted practice. */
  missedItemIds: string[];
}

export function scoreAssessment(
  definition: Pick<AssessmentDefinition, "passThreshold">,
  responses: readonly AssessmentResponse[],
): AssessmentResult {
  const total = responses.length;
  const correct = responses.filter((r) => r.correct).length;
  const score = total === 0 ? 0 : correct / total;
  return {
    total,
    correct,
    score,
    passed: total > 0 && score >= definition.passThreshold,
    missedItemIds: responses.filter((r) => !r.correct).map((r) => r.contentItemId),
  };
}
