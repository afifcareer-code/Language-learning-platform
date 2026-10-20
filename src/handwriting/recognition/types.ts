import type { WritingSample } from "../strokes/types";

/** What the learner was asked to write. Language modules map their items to this. */
export interface WritingTarget {
  /** The character or text to write. */
  text: string;
  /** Accepted stroke counts, when known. */
  strokeCounts?: readonly number[];
}

export interface WritingCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export interface WritingAnalysis {
  checks: WritingCheck[];
}

/**
 * Pluggable handwriting analysis. V0.1 ships structural checks only;
 * shape matching, stroke-order and ML recognisers implement the same interface.
 */
export interface HandwritingAnalyzer {
  analyze(sample: WritingSample, target: WritingTarget): WritingAnalysis;
}
