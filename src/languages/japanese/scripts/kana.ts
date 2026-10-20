import { z } from "zod";

export const KANA_SCRIPTS = ["hiragana", "katakana"] as const;
export type KanaScript = (typeof KANA_SCRIPTS)[number];

/** Content type identifier for kana items in the generic content store. */
export const KANA_CONTENT_TYPE = "ja.kana";

export const kanaCharacterSchema = z.object({
  kana: z.string().length(1),
  romaji: z.string().regex(/^[a-z]+$/),
  alternateRomaji: z.array(z.string().regex(/^[a-z]+$/)).optional(),
  /** Gojūon row, identified by its first romaji syllable ("a", "ka", ...). */
  row: z.string().min(1),
  strokeCount: z.number().int().positive(),
  alternateStrokeCounts: z.array(z.number().int().positive()).optional(),
});

export const kanaFileSchema = z.object({
  script: z.enum(KANA_SCRIPTS),
  source: z.string(),
  characters: z.array(kanaCharacterSchema).min(1),
});

export type KanaCharacter = z.infer<typeof kanaCharacterSchema>;

/** The language-specific payload stored in `ContentItem.data` for kana items. */
export interface KanaItemData extends KanaCharacter {
  script: KanaScript;
}

export function kanaItemKey(script: KanaScript, kana: string): string {
  return `${script}:${kana}`;
}

export function kanaItemId(script: KanaScript, romaji: string): string {
  return `ja.${script}.${romaji}`;
}

export function isKanaItemData(data: unknown): data is KanaItemData {
  return (
    typeof data === "object" &&
    data !== null &&
    KANA_SCRIPTS.includes((data as KanaItemData).script) &&
    typeof (data as KanaItemData).kana === "string"
  );
}

/** Normalise a typed romaji answer: case, surrounding whitespace, and long-vowel marks. */
export function normalizeRomaji(input: string): string {
  return input.trim().toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");
}

export function acceptedRomaji(item: Pick<KanaCharacter, "romaji" | "alternateRomaji">): string[] {
  return [item.romaji, ...(item.alternateRomaji ?? [])];
}

export function checkRomaji(
  item: Pick<KanaCharacter, "romaji" | "alternateRomaji">,
  answer: string,
): boolean {
  const normalized = normalizeRomaji(answer);
  return normalized.length > 0 && acceptedRomaji(item).includes(normalized);
}

export function acceptedStrokeCounts(
  item: Pick<KanaCharacter, "strokeCount" | "alternateStrokeCounts">,
): number[] {
  return [item.strokeCount, ...(item.alternateStrokeCounts ?? [])];
}
