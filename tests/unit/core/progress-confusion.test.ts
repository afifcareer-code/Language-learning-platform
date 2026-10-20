import { describe, expect, it } from "vitest";
import {
  courseProgress,
  learningReadiness,
  needsRemediation,
  pairKey,
  recordConfusion,
  recordPairSuccess,
  skillMastery,
} from "@/core/analytics";
import type { MasteryState } from "@/core/mastery";

const states =
  (map: Record<string, MasteryState>) =>
  (id: string, skill: string): MasteryState =>
    map[`${id}|${skill}`] ?? "not_started";

describe("three progress concepts", () => {
  const activities = [
    { skill: "read", contentItemIds: ["a", "b"], targetMastery: "proficient" as MasteryState },
    { skill: "write", contentItemIds: ["a", "b"], targetMastery: "proficient" as MasteryState },
  ];
  const map = states({ "a|read": "learning", "b|read": "proficient", "a|write": "practicing" });

  it("course progress counts activities worked through", () => {
    expect(courseProgress(activities, map)).toEqual({
      completedActivities: 1,
      totalActivities: 2,
      ratio: 0.5,
    });
  });

  it("skill mastery counts only items proficient or better", () => {
    expect(skillMastery("read", ["a", "b"], map)).toMatchObject({ demonstrated: 1, total: 2, ratio: 0.5 });
    expect(skillMastery("write", ["a", "b"], map).demonstrated).toBe(0);
  });

  it("readiness requires most items at practicing or better on every skill", () => {
    const r = learningReadiness(["a", "b"], ["read", "write"], map);
    expect(r).toMatchObject({ ready: 2, total: 4, isReady: false, threshold: 0.8 });
    const all = learningReadiness(["a"], ["read"], states({ "a|read": "practicing" }));
    expect(all.isReady).toBe(true);
  });
});

describe("confusion pairs", () => {
  const t0 = new Date("2026-01-01T00:00:00Z");

  it("stores pairs in a stable order and counts confusions", () => {
    expect(pairKey("b", "a")).toEqual(["a", "b"]);
    const once = recordConfusion(null, "tsu", "shi", t0);
    expect(once).toMatchObject({ itemA: "shi", itemB: "tsu", errorCount: 1, status: "open" });
    expect(needsRemediation(once)).toBe(false);
    expect(needsRemediation(recordConfusion(once, "shi", "tsu", t0))).toBe(true);
  });

  it("is resolved after enough correct answers, and reopens on a new confusion", () => {
    let pair = recordConfusion(recordConfusion(null, "a", "b", t0), "a", "b", t0);
    for (let i = 0; i < 3; i++) pair = recordPairSuccess(pair);
    expect(pair.status).toBe("improving");
    pair = recordPairSuccess(pair);
    expect(pair.status).toBe("resolved");
    expect(needsRemediation(pair)).toBe(false);
    expect(recordConfusion(pair, "a", "b", t0)).toMatchObject({
      status: "open",
      errorCount: 3,
      correctSinceError: 0,
    });
  });
});
