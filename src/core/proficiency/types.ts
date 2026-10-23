import type { SkillId } from "../learning/types";

/**
 * Language-agnostic proficiency vocabulary.
 *
 * A proficiency level groups competencies by domain. A competency is measured
 * by the mastery of items on one or more skills, so evidence always traces back
 * to attempts. Thresholds here are the platform's own internal standard, never
 * an official score.
 */

/** Whether the platform has content to measure a competency yet. */
export type Availability = "available" | "planned";

export interface CompetencySpec {
  id: string;
  /** The domain this competency belongs to, e.g. "vocabulary". */
  domain: string;
  /** Skills whose mastery is the evidence for this competency. */
  skills: readonly SkillId[];
  availability: Availability;
  /** True when an official exam measures this domain; false for platform-only competencies. */
  examAligned: boolean;
  /** Display title per locale code; the first locale is the fallback. */
  title: Readonly<Record<string, string>>;
}

export interface ProficiencyThresholds {
  /** Share of a competency's item-skill pairs that must be proficient or mastered to call it secure. */
  secureShare: number;
  /** Share that must be mastered (survived long review gaps) to call it retained. */
  retainedShare: number;
  /** Share of the prerequisite's item-skill pairs that must be at least practicing. */
  prerequisiteShare: number;
  /** Mock assessment: minimum score in each section, in [0, 1]. */
  sectionPass: number;
  /** Mock assessment: minimum overall score, in [0, 1]. */
  overallPass: number;
}

export interface AssessmentSectionSpec {
  id: string;
  domain: string;
  skill: SkillId;
  questionCount: number;
}

export interface ProficiencyLevelSpec {
  /** Platform level slug, e.g. "n5". */
  level: string;
  prerequisiteLevel: string | null;
  /** Skills of the prerequisite level whose mastery proves it was achieved. */
  prerequisiteSkills: readonly SkillId[];
  domains: readonly string[];
  competencies: readonly CompetencySpec[];
  thresholds: ProficiencyThresholds;
  assessment: { sections: readonly AssessmentSectionSpec[] };
}

export const COMPETENCY_STATUSES = ["planned", "not_started", "developing", "secure", "retained"] as const;
export type CompetencyStatus = (typeof COMPETENCY_STATUSES)[number];

export const READINESS_STATES = [
  "not_ready",
  "developing",
  "assessment_ready",
  "certification_ready",
] as const;
export type ReadinessState = (typeof READINESS_STATES)[number];

/** Mastery state of one item on one skill, as far as proficiency is concerned. */
export type PairState =
  "not_started" | "learning" | "practicing" | "proficient" | "mastered" | "needs_review";

export interface CompetencyProgress {
  id: string;
  domain: string;
  availability: Availability;
  examAligned: boolean;
  total: number;
  started: number;
  secure: number;
  retained: number;
  status: CompetencyStatus;
}

export interface SectionResult {
  id: string;
  domain: string;
  total: number;
  correct: number;
  score: number;
  passed: boolean;
  /** Questions on items the learner had never practiced before this sitting. */
  novel: number;
}

export interface MockAssessmentResult {
  sections: SectionResult[];
  total: number;
  correct: number;
  score: number;
  passed: boolean;
}

/** Why readiness is what it is. Codes are localized by the UI. */
export type ReadinessReason =
  | { code: "prerequisite_unmet" }
  | { code: "competency_not_secure"; competency: string }
  | { code: "competency_not_retained"; competency: string }
  | { code: "competency_planned"; competency: string }
  | { code: "assessment_not_taken" }
  | { code: "assessment_section_failed"; section: string }
  | { code: "assessment_failed" };

export interface Readiness {
  state: ReadinessState;
  strengths: string[];
  gaps: ReadinessReason[];
}
