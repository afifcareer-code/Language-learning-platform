import { describe, expect, it } from "vitest";
import { recommendNext } from "@/core/recommendation";

const lesson = { id: "l1", slug: "lesson-1", title: "Lesson 1" };

describe("recommendNext", () => {
  it("prioritises due reviews, then weak items, then new material", () => {
    const recs = recommendNext({
      dueReviews: [{ skill: "s.read", count: 4 }],
      weakItems: [{ contentItemId: "a", skill: "s.write", state: "learning" }],
      nextLesson: lesson,
    });
    expect(recs.map((r) => r.kind)).toEqual(["review", "practice", "learn"]);
  });

  it("ignores skills with nothing due and items that are not weak", () => {
    const recs = recommendNext({
      dueReviews: [{ skill: "s.read", count: 0 }],
      weakItems: [{ contentItemId: "a", skill: "s.read", state: "proficient" }],
      nextLesson: lesson,
    });
    expect(recs).toEqual([{ kind: "learn", lesson, reason: "Next in your curriculum" }]);
  });

  it("returns nothing when everything is done", () => {
    expect(recommendNext({ dueReviews: [], weakItems: [], nextLesson: null })).toEqual([]);
  });
});
