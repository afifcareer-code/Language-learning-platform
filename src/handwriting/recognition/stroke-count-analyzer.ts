import type { WritingSample } from "../strokes/types";
import type { HandwritingAnalyzer, WritingAnalysis, WritingTarget } from "./types";

export const STROKE_COUNT_CHECK = "stroke-count";

/** Compares the number of strokes drawn with the accepted stroke counts. */
export class StrokeCountAnalyzer implements HandwritingAnalyzer {
  analyze(sample: WritingSample, target: WritingTarget): WritingAnalysis {
    if (!target.strokeCounts?.length) return { checks: [] };
    const drawn = sample.strokes.length;
    return {
      checks: [
        {
          id: STROKE_COUNT_CHECK,
          passed: target.strokeCounts.includes(drawn),
          values: { count: drawn, expected: [...target.strokeCounts] },
        },
      ],
    };
  }
}
