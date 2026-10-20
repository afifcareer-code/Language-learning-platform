import { SUCCESS_CRITERIA, type ActivityType, type SuccessCriterion } from "@/core/activities";
import { MASTERY_STATES, type MasteryState } from "@/core/mastery";
import type { Messages } from "./messages";
import type { Translator } from "./translator";

/** Localized labels for shared domain values. */

export function masteryLabels(t: Translator<Messages>): Record<MasteryState, string> {
  return Object.fromEntries(MASTERY_STATES.map((s) => [s, t(`common.mastery.${s}`)])) as Record<
    MasteryState,
    string
  >;
}

export function criterionLabel(t: Translator<Messages>, criterion: SuccessCriterion): string {
  return SUCCESS_CRITERIA.includes(criterion) ? t(`common.criteria.${criterion}`) : criterion;
}

export function activityTypeLabel(t: Translator<Messages>, type: ActivityType): string {
  return t(`common.activityTypes.${type}`);
}

/** A skill's label from its language module's messages, e.g. "Kana writing". */
export function skillLabel(t: Translator<Messages>, skill: string): string {
  const languageCode = skill.split(".")[0] ?? "";
  return t.dynamic([languageCode, "skills", skill, "label"], undefined, skill);
}

export function skillDescription(t: Translator<Messages>, skill: string): string {
  const languageCode = skill.split(".")[0] ?? "";
  return t.dynamic([languageCode, "skills", skill, "description"], undefined, "");
}

/** A catalog language's name in the UI language, e.g. "Bahasa Jepang". */
export function languageName(t: Translator<Messages>, code: string): string {
  return t.dynamic(["languages", "names", code], undefined, code);
}

/** A proficiency framework's display name, e.g. "JLPT". */
export function frameworkName(t: Translator<Messages>, framework: string | null): string {
  return framework
    ? t.dynamic(["languages", "frameworks", framework], undefined, framework.toUpperCase())
    : "";
}
