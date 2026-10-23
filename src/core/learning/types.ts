/**
 * Generic learning vocabulary shared by every language module.
 *
 * Nothing in this file may refer to a specific language. Language-specific
 * attributes travel inside `ContentItem.data`, typed by the owning module.
 */

/** BCP 47 language tag, e.g. "ja". */
export type LanguageCode = string;

/**
 * The learning progression every item moves through. Mastery is measured
 * against these stages, not against lessons completed.
 */
export const LEARNING_STAGES = [
  "recognition",
  "understanding",
  "recall",
  "production",
  "automaticity",
  "retention",
] as const;
export type LearningStage = (typeof LEARNING_STAGES)[number];

/**
 * Capabilities a language module may declare. Core features check
 * capabilities instead of asking "is this Japanese?".
 */
export const CAPABILITIES = [
  "reading",
  "listening",
  "writing",
  "speaking",
  "vocabulary",
  "grammar",
  "pronunciation",
  "character-recognition",
  "character-writing",
  "sentence-production",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** Identifier of a skill declared by a language module, namespaced by language code. */
export type SkillId = string;

/**
 * A measurable ability on a content item. Mastery is tracked per item per skill.
 * Human-readable labels are localized by the owning module, keyed by `id`.
 */
export interface SkillDefinition {
  id: SkillId;
  stage: LearningStage;
  capability: Capability;
}

/** A unit of learnable content. `type` and `data` are owned by the language module. */
export interface ContentItem<TData = unknown> {
  id: string;
  languageCode: LanguageCode;
  type: string;
  key: string;
  data: TData;
  tags: readonly string[];
  /** The proficiency level the item belongs to, when it has one. */
  levelId?: string | null;
}

export type AttemptMode = "learn" | "practice" | "review" | "assessment";

/** The outcome of grading a single learner response. */
export interface ResponseEvaluation {
  correct: boolean;
  /** Normalised performance in [0, 1]. */
  score: number;
  /** The canonical expected answer, for feedback. */
  expected?: string;
  /**
   * When a wrong answer is the correct answer for a different item, that
   * item's id. Feeds confusion-pair tracking.
   */
  confusedWithItemId?: string;
}

export interface AttemptOutcome {
  correct: boolean;
  score: number;
  at: Date;
}
