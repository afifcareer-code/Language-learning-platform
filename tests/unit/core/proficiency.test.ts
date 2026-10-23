import { describe, expect, it } from "vitest";
import {
  assessReadiness,
  competencyProgress,
  prerequisiteMet,
  scoreMockAssessment,
  type CompetencySpec,
  type PairState,
  type ProficiencyLevelSpec,
} from "@/core/proficiency";
import { frameworkFileSchema, japaneseFramework, japaneseLevelSpec } from "@/languages/japanese/proficiency";

const spec = japaneseLevelSpec("n5")!;
const th = spec.thresholds;
const available: CompetencySpec = spec.competencies.find((c) => c.availability === "available")!;
const planned: CompetencySpec = spec.competencies.find((c) => c.availability === "planned")!;
const pairs = (n: number, state: PairState): PairState[] => Array.from({ length: n }, () => state);

describe("competency progress", () => {
  it("is not started with no evidence and developing with partial evidence", () => {
    expect(competencyProgress(available, pairs(10, "not_started"), th).status).toBe("not_started");
    expect(
      competencyProgress(available, [...pairs(3, "proficient"), ...pairs(7, "learning")], th).status,
    ).toBe("developing");
  });

  it("is secure at the share threshold and retained only when enough is mastered", () => {
    expect(
      competencyProgress(available, [...pairs(8, "proficient"), ...pairs(2, "learning")], th).status,
    ).toBe("secure");
    expect(
      competencyProgress(
        available,
        [...pairs(6, "mastered"), ...pairs(2, "proficient"), ...pairs(2, "learning")],
        th,
      ).status,
    ).toBe("retained");
  });

  it("does not count items that need review as secure, and never measures planned competencies", () => {
    expect(competencyProgress(available, pairs(10, "needs_review"), th).status).toBe("developing");
    expect(competencyProgress(planned, pairs(10, "mastered"), th).status).toBe("planned");
  });
});

describe("prerequisite", () => {
  it("needs most prerequisite items practicing or better, not just visited", () => {
    expect(prerequisiteMet(pairs(10, "learning"), th)).toBe(false);
    expect(prerequisiteMet([...pairs(8, "practicing"), ...pairs(2, "learning")], th)).toBe(true);
    expect(prerequisiteMet([], th)).toBe(false);
  });
});

describe("mock assessment", () => {
  const sections = spec.assessment.sections;
  const answers = (n: number, ok: number, practicedBefore = true) =>
    Array.from({ length: n }, (_, i) => ({ correct: i < ok, practicedBefore }));

  it("passes only when every section and the overall score pass", () => {
    const all = (ok: (i: number) => number) =>
      Object.fromEntries(
        sections.map((x, i) => [x.id, answers(x.questionCount, ok(i) === 1 ? x.questionCount : 0)]),
      );
    const good = scoreMockAssessment(
      sections,
      all(() => 1),
      th,
    );
    expect(good.passed).toBe(true);
    const weak = scoreMockAssessment(
      sections,
      all((i) => (i === 0 ? 0 : 1)),
      th,
    );
    expect(weak.passed).toBe(false);
    expect(weak.sections[0]!.passed).toBe(false);
  });

  it("reports how many questions were on unseen items, and fails an empty sitting", () => {
    const [a, b] = sections;
    const r = scoreMockAssessment(sections, { [a!.id]: answers(4, 4, false), [b!.id]: [] }, th);
    expect(r.sections[0]!.novel).toBe(4);
    expect(r.passed).toBe(false);
  });
});

describe("readiness", () => {
  const level: ProficiencyLevelSpec = spec;
  const progress = (states: Record<string, PairState[]>) =>
    level.competencies.map((c) => competencyProgress(c, states[c.id] ?? [], th));
  const secureAll = Object.fromEntries(
    level.competencies
      .filter((c) => c.availability === "available")
      .map((c) => [c.id, pairs(10, "proficient")]),
  );
  const passed = scoreMockAssessment(
    level.assessment.sections,
    Object.fromEntries(
      level.assessment.sections.map((s) => [
        s.id,
        Array.from({ length: s.questionCount }, () => ({ correct: true, practicedBefore: false })),
      ]),
    ),
    th,
  );

  it("is Not Ready without the prerequisite or without any evidence", () => {
    expect(
      assessReadiness({ spec: level, prerequisiteMet: false, competencies: progress(secureAll), mock: null })
        .state,
    ).toBe("not_ready");
    expect(
      assessReadiness({ spec: level, prerequisiteMet: true, competencies: progress({}), mock: null }).state,
    ).toBe("not_ready");
  });

  it("is Developing while an available skill is not secure, and explains the gap", () => {
    const some = { ...secureAll, [available.id]: pairs(10, "learning") };
    const r = assessReadiness({
      spec: level,
      prerequisiteMet: true,
      competencies: progress(some),
      mock: null,
    });
    expect(r.state).toBe("developing");
    expect(r.gaps).toContainEqual({ code: "competency_not_secure", competency: available.id });
  });

  it("is Assessment Ready when available skills are secure, and never Certification Ready while a domain is planned", () => {
    const r = assessReadiness({
      spec: level,
      prerequisiteMet: true,
      competencies: progress(secureAll),
      mock: passed,
    });
    expect(r.state).toBe("assessment_ready");
    expect(r.gaps.some((g) => g.code === "competency_planned")).toBe(true);
  });

  it("reaches Certification Ready only with everything retained, a passed mock and no planned domain", () => {
    const only: ProficiencyLevelSpec = {
      ...level,
      competencies: level.competencies.filter((c) => c.availability === "available"),
    };
    const retained = only.competencies.map((c) => competencyProgress(c, pairs(10, "mastered"), th));
    const mock = scoreMockAssessment(
      only.assessment.sections,
      Object.fromEntries(
        only.assessment.sections.map((s) => [s.id, [{ correct: true, practicedBefore: false }]]),
      ),
      th,
    );
    expect(assessReadiness({ spec: only, prerequisiteMet: true, competencies: retained, mock }).state).toBe(
      "certification_ready",
    );
    expect(
      assessReadiness({ spec: only, prerequisiteMet: true, competencies: retained, mock: null }).state,
    ).toBe("assessment_ready");
  });
});

describe("japanese proficiency data", () => {
  it("lists the path N5 → N1 with each level's prerequisite being the previous one", () => {
    const f = japaneseFramework();
    expect(f.levels.map((l) => l.level)).toEqual(["n5", "n4", "n3", "n2", "n1"]);
    expect(f.levels.map((l) => l.prerequisite)).toEqual(["foundation", "n5", "n4", "n3", "n2"]);
    expect(frameworkFileSchema.safeParse(f).success).toBe(true);
  });

  it("only N5 has a specification, and thresholds are the platform's own", () => {
    expect(japaneseLevelSpec("n5")).not.toBeNull();
    expect(japaneseLevelSpec("n4")).toBeNull();
  });
});
