import type { LanguageCode, SkillId } from "../learning/types";
import type { MasteryState } from "../mastery/mastery";

/**
 * An activity is a measurable learning action, not a screen. It ties a
 * curriculum position to an objective, the skill it trains, the content it
 * uses and how attempts are evaluated.
 *
 * Localized text (title, objective, instruction, explanation) lives in
 * translation records keyed by locale, never in fields per language.
 */

/** Capability-oriented activity types. A language module uses the ones it supports. */
export const ACTIVITY_TYPES = [
  "recognition",
  "recall",
  "multiple_choice",
  "matching",
  "writing",
  "listening",
  "reading",
  "translation",
  "sentence_building",
  "grammar_application",
  "speaking",
  "shadowing",
  "production",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** How attempts are graded. */
export const EVALUATION_STRATEGIES = [
  /** The learner picks one option; correct when it is the target. */
  "choice",
  /** Free text graded by the language module (normalisation, alternatives). */
  "typed_response",
  /** Learner self-assessment, capped by automatic checks. */
  "self_assessment_with_checks",
] as const;
export type EvaluationStrategy = (typeof EVALUATION_STRATEGIES)[number];

/**
 * Reusable, language-agnostic success criteria. An activity lists only the
 * criteria it actually evaluates today.
 */
export const SUCCESS_CRITERIA = [
  "recognition",
  "sound_recall",
  "meaning_recall",
  "recall",
  "production",
  "contextual_usage",
  "stroke_count",
  "stroke_order",
  "shape_accuracy",
  "proportion",
  "position",
  "consistency",
  "audio_recognition",
  "word_identification",
  "pattern_recognition",
  "application",
  "sentence_accuracy",
] as const;
export type SuccessCriterion = (typeof SUCCESS_CRITERIA)[number];

export const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface ActivityDefinition {
  id: string;
  languageCode: LanguageCode;
  lessonId: string | null;
  type: ActivityType;
  skill: SkillId;
  difficulty: Difficulty;
  evaluation: EvaluationStrategy;
  successCriteria: readonly SuccessCriterion[];
  /** Share of correct answers in a session for the objective to count as met, in [0, 1]. */
  passScore: number;
  /** The mastery state every target item should reach for the outcome to be achieved. */
  targetMastery: MasteryState;
  contentItemIds: readonly string[];
  sortOrder: number;
}

/** Localized text of an activity for one locale. */
export interface ActivityText {
  title: string;
  /** What the learner should be able to do afterwards. Must be measurable. */
  objective: string;
  /** What to do right now. */
  instruction: string;
  /** Why this activity matters, shown on request. */
  explanation: string;
}

/** The default evaluation strategy for an activity type. */
export function evaluationFor(type: ActivityType): EvaluationStrategy {
  switch (type) {
    case "recognition":
    case "multiple_choice":
    case "matching":
    case "listening":
      return "choice";
    case "writing":
    case "speaking":
    case "shadowing":
      return "self_assessment_with_checks";
    default:
      return "typed_response";
  }
}
