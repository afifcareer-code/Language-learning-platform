import type { ContentItem } from "@/core/learning";
import type { WritingStage } from "@/handwriting/guidance";
import { acceptedStrokeCounts, isKanaItemData, type KanaItemData } from "@/languages/japanese";

/**
 * Adapters from Japanese kana content to the view models used by pages and
 * by the language-agnostic practice components.
 */

export interface KanaView {
  id: string;
  kana: string;
  romaji: string;
  script: KanaItemData["script"];
  strokeCounts: number[];
}

export function toKanaView(item: ContentItem): KanaView | null {
  if (!isKanaItemData(item.data)) return null;
  return {
    id: item.id,
    kana: item.data.kana,
    romaji: item.data.romaji,
    script: item.data.script,
    strokeCounts: acceptedStrokeCounts(item.data),
  };
}

export function toKanaViews(items: readonly ContentItem[]): KanaView[] {
  return items.map(toKanaView).filter((v): v is KanaView => v !== null);
}

/** The text that represents an item, e.g. "あ". */
export function itemDisplay(item: ContentItem | undefined): string {
  return item && isKanaItemData(item.data) ? item.data.kana : (item?.key ?? "");
}

/** What a practice component needs to show one prompt. Serializable. */
export interface PracticeItem {
  id: string;
  /** What is shown as the prompt (the character). */
  display: string;
  /** BCP 47 tag of `display`, for fonts, screen readers and speech. */
  displayLang: string;
  /** The expected answer shown in feedback (the reading). */
  answer: string;
  /** For writing: the cue the learner writes from, and what kind of character to write. */
  cue: string;
  cueKind: string;
  strokeCounts: number[];
  stage: WritingStage;
  choices: { id: string; label: string }[];
}

export function toPracticeItem(
  item: ContentItem,
  options: {
    choiceItems: ContentItem[];
    stage: WritingStage;
    scriptName: (script: KanaItemData["script"]) => string;
  },
): PracticeItem | null {
  const kana = toKanaView(item);
  if (!kana) return null;
  return {
    id: kana.id,
    display: kana.kana,
    displayLang: "ja",
    answer: kana.romaji,
    cue: kana.romaji,
    cueKind: options.scriptName(kana.script),
    strokeCounts: kana.strokeCounts,
    stage: options.stage,
    choices: toKanaViews(options.choiceItems).map((c) => ({ id: c.id, label: c.romaji })),
  };
}
