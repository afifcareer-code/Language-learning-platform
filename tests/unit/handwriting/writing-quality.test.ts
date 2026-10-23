import { describe, expect, it } from "vitest";
import {
  evaluateWriting,
  normalizePoints,
  selfAssessmentOf,
  shapeSimilarity,
  SHAPE_THRESHOLDS,
  type Stroke,
  type WritingCheck,
  type WritingSample,
} from "@/handwriting";

const strokes = (checkPassed: boolean | null): WritingCheck[] =>
  checkPassed === null
    ? []
    : [{ id: "stroke-count", passed: checkPassed, values: { count: 3, expected: [3] } }];

const evaluate = (
  shapeScore: number | null,
  self: "correct" | "close" | "incorrect",
  ok: boolean | null = true,
) => evaluateWriting({ checks: strokes(ok), shapeScore, self });

describe("writing evaluation: character correctness and precision are separate", () => {
  it("rates a correct character by how closely its shape follows the model", () => {
    expect(evaluate(0.9, "correct")).toMatchObject({
      characterCorrect: true,
      quality: "excellent",
      score: 1,
    });
    expect(evaluate(0.6, "correct")).toMatchObject({ characterCorrect: true, quality: "good", score: 0.9 });
    expect(evaluate(0.3, "correct")).toMatchObject({
      characterCorrect: true,
      quality: "needs_improvement",
      score: 0.65,
    });
  });

  it("never turns a correct but imprecise character into a failure", () => {
    for (const shape of [0, 0.1, 0.3, SHAPE_THRESHOLDS.good - 0.01]) {
      const result = evaluate(shape, "correct");
      expect(result.characterCorrect).toBe(true);
      expect(result.quality).toBe("needs_improvement");
      expect(result.score).toBeGreaterThan(0);
    }
  });

  it("marks a character the learner says is not the one as incorrect, whatever the shape score", () => {
    expect(evaluate(0.95, "incorrect")).toMatchObject({
      characterCorrect: false,
      quality: "incorrect",
      score: 0,
    });
  });

  it("lets a wrong stroke count only lower a correct character, to needs improvement", () => {
    expect(evaluate(0.95, "correct", false)).toMatchObject({
      characterCorrect: true,
      strokeCountCorrect: false,
      quality: "needs_improvement",
    });
    expect(evaluate(0.95, "correct", true).strokeCountCorrect).toBe(true);
    expect(evaluate(0.95, "correct", null).strokeCountCorrect).toBeNull();
  });

  it("treats the learner's own 'close' as imprecise, never as excellent", () => {
    expect(evaluate(0.95, "close")).toMatchObject({ characterCorrect: true, quality: "needs_improvement" });
  });

  it("falls back to the stroke count when the shape cannot be measured on the device", () => {
    expect(evaluate(null, "correct", true)).toMatchObject({ quality: "good", shapeScore: null });
    expect(evaluate(null, "correct", false).quality).toBe("needs_improvement");
    expect(evaluate(null, "incorrect", true).quality).toBe("incorrect");
  });

  it("stores quality in the self-assessment column that older rows share", () => {
    expect(selfAssessmentOf("excellent")).toBe("correct");
    expect(selfAssessmentOf("good")).toBe("correct");
    expect(selfAssessmentOf("needs_improvement")).toBe("close");
    expect(selfAssessmentOf("incorrect")).toBe("incorrect");
  });
});

/** A plus-shaped "glyph" as ink points, and drawings made of strokes. */
const plus = [
  ...Array.from({ length: 21 }, (_, i) => ({ x: i / 20, y: 0.5 })),
  ...Array.from({ length: 21 }, (_, i) => ({ x: 0.5, y: i / 20 })),
];

function stroke(index: number, points: [number, number][]): Stroke {
  return {
    index,
    pointerType: "mouse",
    points: points.map(([x, y], t) => ({ x, y, t, pressure: null })),
  };
}
const sampleOf = (...s: Stroke[]): WritingSample => ({ strokes: s, width: 1, height: 1, capturedAt: "" });

describe("shape similarity", () => {
  const drawnPlus = (scale = 1, dx = 0, dy = 0) =>
    sampleOf(
      stroke(0, [
        [dx, 0.5 * scale + dy],
        [1 * scale + dx, 0.5 * scale + dy],
      ]),
      stroke(1, [
        [0.5 * scale + dx, dy],
        [0.5 * scale + dx, 1 * scale + dy],
      ]),
    );

  it("scores a drawing that follows the glyph high", () => {
    expect(shapeSimilarity(drawnPlus(), plus)).toBeGreaterThan(0.9);
  });

  it("does not depend on where the learner wrote or how large", () => {
    const base = shapeSimilarity(drawnPlus(), plus)!;
    expect(shapeSimilarity(drawnPlus(0.4, 0.3, 0.2), plus)!).toBeCloseTo(base, 1);
    expect(shapeSimilarity(drawnPlus(1.8, -0.2, -0.3), plus)!).toBeCloseTo(base, 1);
  });

  it("scores a different shape, or only part of the glyph, lower", () => {
    const circle = sampleOf(
      stroke(
        0,
        Array.from({ length: 41 }, (_, i): [number, number] => [
          0.5 + 0.5 * Math.cos((i / 40) * 2 * Math.PI),
          0.5 + 0.5 * Math.sin((i / 40) * 2 * Math.PI),
        ]),
      ),
    );
    const half = sampleOf(
      stroke(0, [
        [0, 0.5],
        [1, 0.5],
      ]),
      stroke(1, [
        [0, 0.5],
        [0.9, 0.55],
      ]),
    );
    const matching = shapeSimilarity(drawnPlus(), plus)!;
    expect(shapeSimilarity(circle, plus)!).toBeLessThan(matching - 0.3);
    expect(shapeSimilarity(half, plus)!).toBeLessThan(matching - 0.15);
  });

  it("makes no claim when there is nothing to compare", () => {
    expect(shapeSimilarity(sampleOf(), plus)).toBeNull();
    expect(shapeSimilarity(drawnPlus(), [])).toBeNull();
  });

  it("scales points into the unit square and keeps the aspect ratio", () => {
    const points = normalizePoints([
      { x: 10, y: 10 },
      { x: 30, y: 20 },
    ]);
    expect(points[0]).toEqual({ x: 0, y: 0.25 });
    expect(points[1]).toEqual({ x: 1, y: 0.75 });
  });
});
