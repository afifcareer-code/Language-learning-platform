import { describe, expect, it } from "vitest";
import { recommendNext } from "@/core/recommendation";

const nextActivity = { id: "a1", skill: "s.read" };
const none = { dueReviews: [], weakItems: [], confusionPairs: [], nextActivity: null };

describe("recommendNext", () => {
  it("prioritises reviews, then confused pairs, then mistakes, then new material, with reasons", () => {
    const recs = recommendNext({
      dueReviews: [{ skill: "s.read", count: 4 }],
      weakItems: [{ contentItemId: "a", skill: "s.write", state: "learning" }],
      confusionPairs: [{ itemA: "x", itemB: "y", errorCount: 3 }],
      nextActivity,
    });
    expect(recs.map((r) => [r.kind, r.reason])).toEqual([
      ["review", "due_for_review"],
      ["confusion", "confused_pair"],
      ["practice", "recent_mistakes"],
      ["activity", "next_in_curriculum"],
    ]);
  });

  it("suggests only the most frequent confusion", () => {
    const recs = recommendNext({
      ...none,
      confusionPairs: [
        { itemA: "a", itemB: "b", errorCount: 2 },
        { itemA: "c", itemB: "d", errorCount: 5 },
      ],
    });
    expect(recs).toEqual([
      { kind: "confusion", itemA: "c", itemB: "d", errorCount: 5, reason: "confused_pair" },
    ]);
  });

  it("ignores skills with nothing due and items that are not weak", () => {
    const recs = recommendNext({
      ...none,
      dueReviews: [{ skill: "s.read", count: 0 }],
      weakItems: [{ contentItemId: "a", skill: "s.read", state: "proficient" }],
      nextActivity,
    });
    expect(recs).toEqual([{ kind: "activity", activity: nextActivity, reason: "next_in_curriculum" }]);
  });

  it("returns nothing when everything is done", () => {
    expect(recommendNext(none)).toEqual([]);
  });
});
