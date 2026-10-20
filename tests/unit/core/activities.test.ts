import { describe, expect, it } from "vitest";
import {
  activityStatus,
  buildChoices,
  evaluationFor,
  meetsMastery,
  summarizeSession,
} from "@/core/activities";
import type { MasteryState } from "@/core/mastery";

const activity = { contentItemIds: ["a", "b", "c"], targetMastery: "proficient" as MasteryState };
const states = (map: Record<string, MasteryState>) => (id: string) => map[id] ?? "not_started";

describe("activity status", () => {
  it("is driven by mastery evidence, not by opening the activity", () => {
    expect(activityStatus(activity, states({}))).toBe("not_started");
    expect(activityStatus(activity, states({ a: "learning" }))).toBe("in_progress");
    expect(activityStatus(activity, states({ a: "learning", b: "practicing", c: "learning" }))).toBe(
      "completed",
    );
    expect(activityStatus(activity, states({ a: "proficient", b: "mastered", c: "proficient" }))).toBe(
      "outcome_achieved",
    );
  });

  it("ranks needs_review below practicing", () => {
    expect(meetsMastery("needs_review", "practicing")).toBe(false);
    expect(meetsMastery("mastered", "proficient")).toBe(true);
  });
});

describe("summarizeSession", () => {
  const at = (h: number) => new Date(Date.UTC(2026, 0, 1, h));
  it("reports score, pass state, mastery change and the earliest next review", () => {
    const outcome = summarizeSession(
      [
        { contentItemId: "a", correct: true, before: "not_started", after: "learning", nextReviewAt: at(10) },
        { contentItemId: "b", correct: false, before: "practicing", after: "learning", nextReviewAt: at(2) },
        { contentItemId: "a", correct: true, before: "learning", after: "practicing", nextReviewAt: at(20) },
      ],
      0.8,
    );
    expect(outcome).toMatchObject({ total: 3, correct: 2, passed: false, improved: 1, declined: 1 });
    expect(outcome.masteryAfter).toMatchObject({ practicing: 1, learning: 1 });
    expect(outcome.nextReviewAt).toEqual(at(2));
  });

  it("never passes an empty session", () => {
    expect(summarizeSession([], 0).passed).toBe(false);
  });
});

describe("buildChoices", () => {
  const pool = ["t", "a", "b", "c", "d", "e"];
  const sequence = () => {
    let i = 0;
    return () => [0.1, 0.7, 0.4, 0.9, 0.2][i++ % 5]!;
  };

  it("includes the target, preferred distractors first, without duplicates", () => {
    const options = buildChoices("t", pool, ["d", "d", "zz", "t"], 4, sequence());
    expect(options).toHaveLength(4);
    expect(options).toContain("t");
    expect(options).toContain("d");
    expect(new Set(options).size).toBe(4);
  });

  it("copes with small pools", () => {
    expect(buildChoices("t", ["t", "a"], [], 4).sort()).toEqual(["a", "t"]);
  });
});

describe("evaluationFor", () => {
  it("maps activity types to evaluation strategies", () => {
    expect(evaluationFor("recognition")).toBe("choice");
    expect(evaluationFor("recall")).toBe("typed_response");
    expect(evaluationFor("writing")).toBe("self_assessment_with_checks");
  });
});
