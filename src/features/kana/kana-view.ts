import type { ContentItem } from "@/core/learning";
import { acceptedStrokeCounts, isKanaItemData, type KanaItemData } from "@/languages/japanese";

/** Serializable view model passed from server pages to client practice components. */
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
