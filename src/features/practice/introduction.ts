import type { PracticeItem } from "@/features/japanese/practice-items";
import type { IntroductionItem } from "./introduction-step";

/**
 * The characters of an activity to introduce before its first question: the
 * ones the learner has no attempt for in any skill, in the activity's own
 * order (the lesson's order). Everything shown comes from the content data
 * through the practice item; only items with a single reading qualify.
 *
 * Principle: never assess a relationship (a sound and its character) before
 * the learner has been shown it.
 */
export function introductionItems(
  activityItemIds: readonly string[],
  items: readonly PracticeItem[],
  attemptedItemIds: ReadonlySet<string>,
): IntroductionItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return activityItemIds
    .map((id) => byId.get(id))
    .filter((i): i is PracticeItem => i !== undefined && i.reading !== "" && !attemptedItemIds.has(i.id))
    .map((i) => ({
      id: i.id,
      display: i.display,
      displayLang: i.displayLang,
      reading: i.reading,
      speech: i.speech,
      speechLang: i.speechLang,
    }));
}
