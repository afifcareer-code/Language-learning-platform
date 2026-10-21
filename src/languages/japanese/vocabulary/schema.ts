import { z } from "zod";
import { localizedTextSchema } from "@/localization/content";

/** Content type of Japanese words in the generic content store. */
export const VOCABULARY_CONTENT_TYPE = "ja.vocabulary";

const romaji = z.string().regex(/^[a-z' -]+$/);
const slug = z.string().regex(/^[a-z0-9-]+$/);

/** A word as authored in data/japanese/vocabulary/*.json. */
export const vocabularyEntrySchema = z.object({
  /** The word in kana, as it is read. */
  kana: z.string().min(1),
  /** Kanji spelling, when the word is usually written with kanji. */
  kanji: z.string().min(1).optional(),
  /** Hepburn romanization: a temporary scaffold for early levels and an accepted typed answer. */
  romaji,
  alternateRomaji: z.array(romaji).optional(),
  /** Prefix/suffix words such as 〜さん are shown with a 〜 marker. */
  affix: z.enum(["prefix", "suffix"]).optional(),
  partOfSpeech: z.enum([
    "noun",
    "pronoun",
    "suffix",
    "expression",
    "verb",
    "adjective",
    "adverb",
    "particle",
  ]),
  meaning: localizedTextSchema,
});

export const vocabularyFileSchema = z.object({
  source: z.string(),
  /** Level slug the words are introduced at, e.g. "n5". */
  level: slug,
  items: z.array(vocabularyEntrySchema).min(1),
});

export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>;

/** Stored in content_items.data (the learning-language part). */
export type VocabularyItemData = Omit<VocabularyEntry, "meaning">;
/** Stored per locale in content_item_translations.data. */
export interface VocabularyTranslation {
  meaning: string;
}

export function vocabularyItemId(entry: Pick<VocabularyEntry, "romaji">): string {
  return `ja.vocab.${entry.romaji.replace(/[^a-z]+/g, "-")}`;
}

export function vocabularyItemKey(entry: Pick<VocabularyEntry, "kana" | "affix">): string {
  return `vocabulary:${entry.affix === "prefix" ? `${entry.kana}〜` : entry.affix === "suffix" ? `〜${entry.kana}` : entry.kana}`;
}

export function isVocabularyData(data: unknown): data is VocabularyItemData {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as VocabularyItemData).kana === "string" &&
    typeof (data as VocabularyItemData).partOfSpeech === "string"
  );
}

/** How the word is shown in Japanese, e.g. "〜さん". */
export function vocabularyDisplay(data: Pick<VocabularyItemData, "kana" | "affix">): string {
  return data.affix === "suffix" ? `〜${data.kana}` : data.affix === "prefix" ? `${data.kana}〜` : data.kana;
}
