import type { WritingAnalysis } from "../recognition/types";

/**
 * The learner's own judgement after comparing their writing with the model.
 * Until shape recognition exists this is the primary correctness signal.
 */
export const SELF_ASSESSMENTS = ["correct", "close", "incorrect"] as const;
export type SelfAssessment = (typeof SELF_ASSESSMENTS)[number];

const SELF_SCORE: Record<SelfAssessment, number> = { correct: 1, close: 0.5, incorrect: 0 };

export interface WritingScore {
  correct: boolean;
  score: number;
}

/**
 * Combine self-assessment with automatic checks. Any failed automatic check
 * caps the score and prevents the attempt from counting as correct.
 */
export function scoreWriting(analysis: WritingAnalysis, self: SelfAssessment): WritingScore {
  const failedChecks = analysis.checks.filter((c) => !c.passed).length;
  const base = SELF_SCORE[self];
  const score = failedChecks > 0 ? Math.min(base, 0.5) : base;
  return { correct: self === "correct" && failedChecks === 0, score };
}
