import { describe, expect, it } from "vitest";
import {
  computePracticeProgress,
  stageMastery,
  validatePracticeSkill,
  type PracticeSkillSpec,
  type StageAttempt,
} from "@/core/practice";

const req = { minAttempts: 4, window: 6, promoteAt: 0.8, demoteBelow: 0.6 };
const session = { skill: "x.skill", type: "recall" as const, itemType: "thing" };
const skill: PracticeSkillSpec = {
  id: "writing",
  capability: "writing",
  stages: [
    { id: "character", focus: "character", availability: "available", requirement: req, session },
    { id: "word", focus: "word", availability: "available", requirement: req, session },
    { id: "sentence", focus: "sentence", availability: "available", requirement: req, session },
    { id: "context", focus: "context", availability: "planned", requirement: req },
  ],
};

let clock = 0;
function attempts(stageId: string, scores: number[]): StageAttempt[] {
  return scores.map((score) => ({ stageId, score, at: new Date(2026, 0, 1, 0, 0, clock++) }));
}

describe("practice progress", () => {
  it("starts on the first stage with no evidence", () => {
    const p = computePracticeProgress(skill, []);
    expect(p.nextStageId).toBe("character");
    expect(p.reason).toBe("start");
    expect(p.stages.map((s) => s.status)).toEqual(["current", "locked", "locked", "planned"]);
  });

  it("does not judge a stage before the minimum number of attempts", () => {
    expect(stageMastery(attempts("character", [1, 1, 1]), req)).toBeNull();
    const p = computePracticeProgress(skill, attempts("character", [1, 1, 1]));
    expect(p.nextStageId).toBe("character");
    expect(p.reason).toBe("continue");
  });

  it("advances when the stage is passed", () => {
    const p = computePracticeProgress(skill, attempts("character", [1, 1, 1, 0.8, 1]));
    expect(p.nextStageId).toBe("word");
    expect(p.reason).toBe("advance");
    expect(p.stages[0]).toMatchObject({ status: "passed" });
    expect(p.stages[1]).toMatchObject({ status: "current" });
  });

  it("goes back one stage when performance is weak, and says why", () => {
    const all = [
      ...attempts("character", [1, 1, 1, 1]),
      ...attempts("word", [1, 1, 1, 1]),
      ...attempts("sentence", [0.5, 0.4, 0.5, 0.5]),
    ];
    const p = computePracticeProgress(skill, all);
    expect(p.nextStageId).toBe("word");
    expect(p.reason).toBe("regress");
    expect(p.weakStageId).toBe("sentence");
    expect(p.stages.find((s) => s.stageId === "sentence")?.status).toBe("needs_work");
  });

  it("keeps working on the stage between demotion and promotion", () => {
    const all = [...attempts("character", [1, 1, 1, 1]), ...attempts("word", [0.7, 0.7, 0.7, 0.7])];
    const p = computePracticeProgress(skill, all);
    expect(p.nextStageId).toBe("word");
    expect(p.reason).toBe("continue");
  });

  it("retries the first stage when it is weak", () => {
    const p = computePracticeProgress(skill, attempts("character", [0, 0.2, 0.2, 0.3]));
    expect(p.nextStageId).toBe("character");
    expect(p.reason).toBe("retry");
  });

  it("returns to an earlier stage when it later declines", () => {
    // character was passed, then recent attempts there fall below the pass level.
    const all = [
      ...attempts("character", [1, 1, 1, 1]),
      ...attempts("word", [1, 1, 1, 1]),
      ...attempts("character", [0.2, 0.2, 0.2, 0.2, 0.2, 0.2]),
    ];
    const p = computePracticeProgress(skill, all);
    expect(p.nextStageId).toBe("character");
    expect(p.reason).toBe("retry");
  });

  it("is mastered when every available stage is passed; planned stages are never offered", () => {
    const all = ["character", "word", "sentence"].flatMap((id) => attempts(id, [1, 1, 1, 1]));
    const p = computePracticeProgress(skill, all);
    expect(p.reason).toBe("mastered");
    expect(p.nextStageId).toBe("sentence");
    expect(p.stages.at(-1)?.status).toBe("planned");
  });

  it("only counts the latest attempts", () => {
    const old = attempts("character", [0, 0, 0, 0, 0, 0]);
    const recent = attempts("character", [1, 1, 1, 1, 1, 1]);
    expect(stageMastery([...old, ...recent], req)).toBe(1);
  });

  it("validates a framework", () => {
    expect(validatePracticeSkill(skill)).toEqual([]);
    expect(
      validatePracticeSkill({
        ...skill,
        stages: [
          { id: "a", focus: "a", availability: "available", requirement: { ...req, demoteBelow: 0.9 } },
        ],
      }),
    ).toHaveLength(2);
  });
});
