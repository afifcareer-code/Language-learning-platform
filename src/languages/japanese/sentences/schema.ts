import { z } from "zod";
import { localizedTextSchema } from "@/localization/content";

/** Content type of practice sentences in the generic content store. */
export const SENTENCE_CONTENT_TYPE = "ja.sentence";

const slug = z.string().regex(/^[a-z0-9-]+$/);

/** A sentence as authored in data/japanese/sentences/*.json. Sentences are original. */
export const sentenceEntrySchema = z.object({
  slug,
  /** The sentence as written for learners at its level, e.g. "わたしは がくせいです。". */
  text: z.string().min(2),
  /** The sentence split into the units a learner arranges (words and particles), in order. */
  tokens: z.array(z.string().min(1)).min(2),
  romaji: z.string().optional(),
  /** The grammar point the sentence practises (its slug). */
  grammar: slug,
  translation: localizedTextSchema,
});

export const sentenceFileSchema = z.object({
  source: z.string(),
  level: slug,
  items: z.array(sentenceEntrySchema).min(1),
});

export type SentenceEntry = z.infer<typeof sentenceEntrySchema>;

export interface SentenceItemData {
  slug: string;
  text: string;
  tokens: string[];
  romaji?: string;
  grammar: string;
}

export interface SentenceTranslation {
  translation: string;
}

export const sentenceItemId = (slug: string) => `ja.sentence.${slug}`;
export const sentenceItemKey = (slug: string) => `sentence:${slug}`;

export function isSentenceData(data: unknown): data is SentenceItemData {
  return typeof data === "object" && data !== null && Array.isArray((data as SentenceItemData).tokens);
}

/** The tokens must spell the text (ignoring spaces and final punctuation). */
export function tokensMatchText(data: Pick<SentenceItemData, "tokens" | "text">): boolean {
  const strip = (s: string) => s.replace(/[\s。？?、]/g, "");
  return strip(data.tokens.join("")) === strip(data.text);
}
