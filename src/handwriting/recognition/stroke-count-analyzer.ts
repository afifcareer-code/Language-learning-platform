import type { WritingSample } from "../strokes/types";
import type { HandwritingAnalyzer, WritingAnalysis, WritingTarget } from "./types";

export const STROKE_COUNT_CHECK = "stroke-count";

/** Compares the number of strokes drawn with the accepted stroke counts. */
export class StrokeCountAnalyzer implements HandwritingAnalyzer {
  analyze(sample: WritingSample, target: WritingTarget): WritingAnalysis {
    if (!target.strokeCounts?.length) return { checks: [] };
    const drawn = sample.strokes.length;
    const passed = target.strokeCounts.includes(drawn);
    const expected = target.strokeCounts.join(" or ");
    return {
      checks: [
        {
          id: STROKE_COUNT_CHECK,
          passed,
          detail: passed
            ? `${drawn} strokes`
            : `${drawn} stroke${drawn === 1 ? "" : "s"} drawn, expected ${expected}`,
        },
      ],
    };
  }
}
