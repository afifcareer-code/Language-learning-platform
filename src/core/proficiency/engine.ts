import type {
  AssessmentSectionSpec,
  CompetencyProgress,
  CompetencySpec,
  MockAssessmentResult,
  PairState,
  ProficiencyLevelSpec,
  ProficiencyThresholds,
  Readiness,
  ReadinessReason,
} from "./types";

const SECURE: ReadonlySet<PairState> = new Set(["proficient", "mastered"]);
const PRACTICING: ReadonlySet<PairState> = new Set(["practicing", "proficient", "mastered"]);

function share(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

/**
 * Progress of one competency from the mastery state of each of its item-skill
 * pairs. Completion of lessons is deliberately not an input.
 */
export function competencyProgress(
  spec: CompetencySpec,
  pairStates: readonly PairState[],
  thresholds: ProficiencyThresholds,
): CompetencyProgress {
  const total = pairStates.length;
  const started = pairStates.filter((s) => s !== "not_started").length;
  const secure = pairStates.filter((s) => SECURE.has(s)).length;
  const retained = pairStates.filter((s) => s === "mastered").length;
  const base = {
    id: spec.id,
    domain: spec.domain,
    availability: spec.availability,
    examAligned: spec.examAligned,
    total,
    started,
    secure,
    retained,
  };
  if (spec.availability === "planned" || total === 0) return { ...base, status: "planned" };
  if (started === 0) return { ...base, status: "not_started" };
  if (share(retained, total) >= thresholds.retainedShare && share(secure, total) >= thresholds.secureShare)
    return { ...base, status: "retained" };
  if (share(secure, total) >= thresholds.secureShare) return { ...base, status: "secure" };
  return { ...base, status: "developing" };
}

/** Whether the previous level's foundation is evidenced by mastery, not by having visited it. */
export function prerequisiteMet(
  pairStates: readonly PairState[],
  thresholds: ProficiencyThresholds,
): boolean {
  return (
    pairStates.length > 0 &&
    share(pairStates.filter((s) => PRACTICING.has(s)).length, pairStates.length) >=
      thresholds.prerequisiteShare
  );
}

export interface SectionResponse {
  correct: boolean;
  /** Whether the learner had practiced the item on this skill before the sitting. */
  practicedBefore: boolean;
}

/** Score a mock assessment sitting: every section and the overall score must pass. */
export function scoreMockAssessment(
  sections: readonly AssessmentSectionSpec[],
  responses: Readonly<Record<string, readonly SectionResponse[]>>,
  thresholds: Pick<ProficiencyThresholds, "sectionPass" | "overallPass">,
): MockAssessmentResult {
  const results = sections.map((section) => {
    const r = responses[section.id] ?? [];
    const correct = r.filter((x) => x.correct).length;
    const score = share(correct, r.length);
    return {
      id: section.id,
      domain: section.domain,
      total: r.length,
      correct,
      score,
      passed: r.length > 0 && score >= thresholds.sectionPass,
      novel: r.filter((x) => !x.practicedBefore).length,
    };
  });
  const total = results.reduce((n, s) => n + s.total, 0);
  const correct = results.reduce((n, s) => n + s.correct, 0);
  const score = share(correct, total);
  return {
    sections: results,
    total,
    correct,
    score,
    passed: total > 0 && results.every((s) => s.passed) && score >= thresholds.overallPass,
  };
}

/**
 * Readiness is a recommendation, not a certificate. Certification Ready needs:
 * the prerequisite, every competency retained, a passed mock assessment, and
 * evidence for every domain: it is never reached while a domain is still planned.
 */
export function assessReadiness(input: {
  spec: ProficiencyLevelSpec;
  prerequisiteMet: boolean;
  competencies: readonly CompetencyProgress[];
  mock: MockAssessmentResult | null;
}): Readiness {
  const { competencies, mock } = input;
  const available = competencies.filter((c) => c.status !== "planned");
  const planned = competencies.filter((c) => c.status === "planned");
  const strengths = available
    .filter((c) => c.status === "secure" || c.status === "retained")
    .map((c) => c.id);

  const gaps: ReadinessReason[] = [];
  if (!input.prerequisiteMet) gaps.push({ code: "prerequisite_unmet" });
  for (const c of available) {
    if (c.status === "not_started" || c.status === "developing")
      gaps.push({ code: "competency_not_secure", competency: c.id });
  }
  for (const c of planned) gaps.push({ code: "competency_planned", competency: c.id });

  const allSecure =
    available.length > 0 && available.every((c) => c.status === "secure" || c.status === "retained");
  const anyStarted = available.some((c) => c.status !== "not_started");

  if (!input.prerequisiteMet || !anyStarted) return { state: "not_ready", strengths, gaps };
  if (!allSecure) return { state: "developing", strengths, gaps };

  if (!mock) gaps.push({ code: "assessment_not_taken" });
  else if (!mock.passed) {
    gaps.push({ code: "assessment_failed" });
    for (const s of mock.sections)
      if (!s.passed) gaps.push({ code: "assessment_section_failed", section: s.id });
  }
  for (const c of available) {
    if (c.status === "secure") gaps.push({ code: "competency_not_retained", competency: c.id });
  }

  const certified =
    planned.length === 0 && mock?.passed === true && available.every((c) => c.status === "retained");
  return { state: certified ? "certification_ready" : "assessment_ready", strengths, gaps };
}
