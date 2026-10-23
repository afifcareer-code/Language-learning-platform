import type { WritingCheck } from "../recognition/types";
import type { SelfAssessment } from "./score";

/**
 * Writing has two separate questions:
 *
 * - Is it the right character?
 * - How precise is the handwriting?
 *
 * The engine cannot tell characters apart from a drawing: measured against
 * real fonts, a sloppy copy of the right character scores no higher than a
 * neat copy of a different one. So correctness is the learner's judgement
 * after comparing with the model, as before. What the engine does measure is
 * precision: the stroke count and how closely the shape follows the model.
 * Those can only lower the rating of a character the learner says is right.
 * A correct but imprecise character is still correct.
 */
export const WRITING_QUALITIES = ["excellent", "good", "needs_improvement", "incorrect"] as const;
export type WritingQuality = (typeof WRITING_QUALITIES)[number];

/**
 * Shape similarity at or above which precision is rated excellent / good.
 * Calibrated on synthetic variations of kana in one font, not on learners'
 * handwriting: tune these against stored `shapeScore`s once there is real data.
 */
export const SHAPE_THRESHOLDS = { good: 0.5, excellent: 0.75 } as const;

/** Mastery score of each quality. A correct character is never scored as a failure. */
const QUALITY_SCORE: Record<WritingQuality, number> = {
  excellent: 1,
  good: 0.9,
  needs_improvement: 0.65,
  incorrect: 0,
};

export interface WritingEvaluation {
  /** The learner confirmed this is the intended character. */
  characterCorrect: boolean;
  /** Null when the stroke count of the character is not known. */
  strokeCountCorrect: boolean | null;
  /** Shape similarity in [0, 1]; null when it could not be measured on this device. */
  shapeScore: number | null;
  quality: WritingQuality;
  /** Score recorded for mastery. */
  score: number;
}

export interface WritingEvidence {
  checks: readonly WritingCheck[];
  /** Measured shape similarity, when a reference glyph was available. */
  shapeScore: number | null;
  /** The learner's judgement of whether they wrote the character. "close" counts as imprecise. */
  self: SelfAssessment;
}

/** Stroke-count check result, or null when there is none. */
export function strokeCountPassed(checks: readonly WritingCheck[]): boolean | null {
  const check = checks.find((c) => c.id === "stroke-count");
  return check ? check.passed : null;
}

function qualityFromShape(shape: number | null): WritingQuality {
  if (shape === null) return "good";
  if (shape >= SHAPE_THRESHOLDS.excellent) return "excellent";
  if (shape >= SHAPE_THRESHOLDS.good) return "good";
  return "needs_improvement";
}

export function evaluateWriting(evidence: WritingEvidence): WritingEvaluation {
  const strokeCountCorrect = strokeCountPassed(evidence.checks);
  const { shapeScore, self } = evidence;

  let quality: WritingQuality = self === "incorrect" ? "incorrect" : qualityFromShape(shapeScore);
  // Automatic checks and the learner's own "close" can only lower the rating.
  if (quality !== "incorrect" && (strokeCountCorrect === false || self === "close")) {
    quality = "needs_improvement";
  }

  return {
    characterCorrect: quality !== "incorrect",
    strokeCountCorrect,
    shapeScore,
    quality,
    score: QUALITY_SCORE[quality],
  };
}

/** How a quality is stored in the self-assessment column, which older rows share. */
export function selfAssessmentOf(quality: WritingQuality): SelfAssessment {
  return quality === "incorrect" ? "incorrect" : quality === "needs_improvement" ? "close" : "correct";
}
