import type { ProficiencyLevelSpec } from "../proficiency/types";
import type {
  Capability,
  ContentItem,
  LanguageCode,
  ResponseEvaluation,
  SkillDefinition,
  SkillId,
} from "./types";

/**
 * The contract a language implements to plug into the core engine.
 *
 * Kept deliberately small for V0.1: identity, declared capabilities, the
 * skills it can measure, and how to grade a typed response.
 */
export interface LanguageModule {
  code: LanguageCode;
  /** The language's own name (endonym), e.g. "Español". Localized names live in `messages`. */
  nativeName: string;
  capabilities: readonly Capability[];
  skills: readonly SkillDefinition[];
  /**
   * Module-owned UI text per platform locale (language name, skill labels,
   * script names…). Merged into the platform messages under the module's code.
   */
  messages: Readonly<Record<string, unknown>>;
  /**
   * Grade a learner's typed response for an item and skill.
   * Returns `null` if the module cannot grade that combination automatically.
   */
  evaluateResponse(item: ContentItem, skill: SkillId, response: string): ResponseEvaluation | null;
  /** The proficiency specification of a level (by platform level slug), when the module defines one. */
  proficiencyLevel?(level: string): ProficiencyLevelSpec | null;
  /** Items commonly confused with this one, used to choose meaningful distractors. */
  knownConfusables?(contentItemId: string): string[];
  /** Whether `b` is a sensible answer option when asking about `a` (e.g. the same writing system). */
  isComparable?(a: ContentItem, b: ContentItem): boolean;
}

export function hasCapability(module: LanguageModule, capability: Capability): boolean {
  return module.capabilities.includes(capability);
}

export function findSkill(module: LanguageModule, skill: SkillId): SkillDefinition | undefined {
  return module.skills.find((s) => s.id === skill);
}
