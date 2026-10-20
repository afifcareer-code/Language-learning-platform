import { describe, expect, it } from "vitest";
import { attemptAccuracy, masteryDistribution } from "@/core/analytics";
import { scoreAssessment } from "@/core/assessment";

describe("scoreAssessment", () => {
  it("scores responses against the pass threshold", () => {
    const result = scoreAssessment({ passThreshold: 0.8 }, [
      { contentItemId: "a", correct: true },
      { contentItemId: "b", correct: true },
      { contentItemId: "c", correct: false },
    ]);
    expect(result).toMatchObject({ total: 3, correct: 2, passed: false, missedItemIds: ["c"] });
    expect(result.score).toBeCloseTo(2 / 3);
  });

  it("never passes an empty attempt", () => {
    expect(scoreAssessment({ passThreshold: 0 }, []).passed).toBe(false);
  });
});

describe("analytics", () => {
  it("counts items without records as not started", () => {
    const d = masteryDistribution(["learning", "mastered"], 5);
    expect(d).toMatchObject({ not_started: 3, learning: 1, mastered: 1, practicing: 0 });
  });

  it("computes accuracy only when there is evidence", () => {
    expect(attemptAccuracy([])).toBeNull();
    expect(attemptAccuracy([{ correct: true }, { correct: false }])).toBe(0.5);
  });
});
