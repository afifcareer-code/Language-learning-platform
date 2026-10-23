import { z } from "zod";
import { localizedTextSchema } from "@/localization/content";

/**
 * A kanji, as built by scripts/content/import-kanji.py: readings and stroke count from KANJIDIC2,
 * stroke paths in writing order from KanjiVG (109×109 grid), meanings written for this project.
 */
export const KANJI_CONTENT_TYPE = "ja.kanji";

export const kanjiEntrySchema = z.object({
  character: z.string().length(1),
  meanings: localizedTextSchema,
  /** On readings in katakana. */
  onyomi: z.array(z.string().min(1)),
  /** Kun readings in hiragana; okurigana in parentheses, e.g. "た(べる)". */
  kunyomi: z.array(z.string().min(1)),
  strokeCount: z.number().int().positive(),
  /** SVG path data of each stroke, in the order it is written. */
  strokes: z.array(z.string().min(1)).min(1),
  /** Vocabulary keys that use this kanji, e.g. "vocabulary:がくせい". */
  vocabulary: z.array(z.string()).optional(),
});

export const kanjiFileSchema = z.object({
  source: z.string(),
  level: z.string().regex(/^[a-z0-9-]+$/),
  items: z.array(kanjiEntrySchema).min(1),
});

export type KanjiEntry = z.infer<typeof kanjiEntrySchema>;
export type KanjiItemData = Omit<KanjiEntry, "meanings">;
export interface KanjiTranslation {
  meaning: string;
}

/** The view box of KanjiVG stroke paths. */
export const KANJI_VIEWBOX = 109;

export const kanjiItemId = (character: string) => `ja.kanji.u${character.codePointAt(0)!.toString(16)}`;
export const kanjiItemKey = (character: string) => `kanji:${character}`;

export function isKanjiData(data: unknown): data is KanjiItemData {
  const d = data as KanjiItemData;
  return (
    typeof data === "object" && data !== null && typeof d.character === "string" && Array.isArray(d.strokes)
  );
}

/** The readings as one line, e.g. "ニチ・ジツ / ひ". */
export function kanjiReadings(data: Pick<KanjiItemData, "onyomi" | "kunyomi">): string {
  return [data.onyomi.join("・"), data.kunyomi.join("・")].filter(Boolean).join(" / ");
}
