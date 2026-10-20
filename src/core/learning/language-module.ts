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
  name: string;
  nativeName: string;
  capabilities: readonly Capability[];
  skills: readonly SkillDefinition[];
  /**
   * Grade a learner's typed response for an item and skill.
   * Returns `null` if the module cannot grade that combination automatically.
   */
  evaluateResponse(item: ContentItem, skill: SkillId, response: string): ResponseEvaluation | null;
}

export function hasCapability(module: LanguageModule, capability: Capability): boolean {
  return module.capabilities.includes(capability);
}

export function findSkill(module: LanguageModule, skill: SkillId): SkillDefinition | undefined {
  return module.skills.find((s) => s.id === skill);
}
