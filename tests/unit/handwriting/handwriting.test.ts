import { describe, expect, it } from "vitest";
import {
  compassDirection,
  scoreWriting,
  StrokeCountAnalyzer,
  strokeFeatures,
  writingStageFor,
  type Stroke,
  type WritingSample,
} from "@/handwriting";

const horizontal: Stroke = {
  index: 0,
  pointerType: "pen",
  points: [
    { x: 0.1, y: 0.5, t: 0, pressure: 0.4 },
    { x: 0.5, y: 0.5, t: 100, pressure: 0.6 },
    { x: 0.9, y: 0.5, t: 200, pressure: null },
  ],
};

const sample = (n: number): WritingSample => ({
  strokes: Array.from({ length: n }, (_, index) => ({ ...horizontal, index })),
  width: 400,
  height: 400,
  capturedAt: "2026-01-01T00:00:00Z",
});

describe("stroke features", () => {
  it("derives start, end, direction, length, velocity and optional pressure", () => {
    const f = strokeFeatures(horizontal)!;
    expect(f.start).toEqual({ x: 0.1, y: 0.5 });
    expect(f.end).toEqual({ x: 0.9, y: 0.5 });
    expect(f.direction).toBe("E");
    expect(f.length).toBeCloseTo(0.8);
    expect(f.averageVelocity).toBeCloseTo(4);
    expect(f.averagePressure).toBeCloseTo(0.5);
  });

  it("handles strokes without pressure or points", () => {
    expect(
      strokeFeatures({ ...horizontal, points: horizontal.points.map((p) => ({ ...p, pressure: null })) })
        ?.averagePressure,
    ).toBeNull();
    expect(strokeFeatures({ ...horizontal, points: [] })).toBeNull();
  });

  it("maps angles to compass directions (y grows downward)", () => {
    expect(compassDirection(Math.PI / 2)).toBe("S");
    expect(compassDirection(-Math.PI / 2)).toBe("N");
    expect(compassDirection(Math.PI)).toBe("W");
  });
});

describe("StrokeCountAnalyzer", () => {
  const analyzer = new StrokeCountAnalyzer();

  it("passes accepted stroke counts, including variants", () => {
    expect(analyzer.analyze(sample(3), { text: "き", strokeCounts: [4, 3] }).checks[0]?.passed).toBe(true);
    expect(analyzer.analyze(sample(2), { text: "き", strokeCounts: [4, 3] }).checks[0]?.passed).toBe(false);
  });

  it("makes no claim when the stroke count is unknown", () => {
    expect(analyzer.analyze(sample(2), { text: "?" }).checks).toEqual([]);
  });
});

describe("scoreWriting", () => {
  const pass = { checks: [{ id: "x", passed: true, detail: "" }] };
  const fail = { checks: [{ id: "x", passed: false, detail: "" }] };

  it("uses self-assessment when automatic checks pass", () => {
    expect(scoreWriting(pass, "correct")).toEqual({ correct: true, score: 1 });
    expect(scoreWriting(pass, "close")).toEqual({ correct: false, score: 0.5 });
  });

  it("never counts a failed automatic check as correct", () => {
    expect(scoreWriting(fail, "correct")).toEqual({ correct: false, score: 0.5 });
  });
});

describe("writing guidance", () => {
  it("fades the scaffold as mastery grows", () => {
    expect(writingStageFor("not_started")).toBe("full_example");
    expect(writingStageFor("practicing")).toBe("faded_example");
    expect(writingStageFor("proficient")).toBe("minimal_hint");
    expect(writingStageFor("mastered")).toBe("recall");
  });
});
