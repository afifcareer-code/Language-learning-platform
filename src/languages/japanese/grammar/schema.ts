import { z } from "zod";
import { localizedTextSchema } from "@/localization/content";

/** Content type of grammar points in the generic content store. */
export const GRAMMAR_CONTENT_TYPE = "ja.grammar";

const slug = z.string().regex(/^[a-z0-9-]+$/);

/** A grammar point as authored in data/japanese/grammar/*.json. Explanations are original. */
export const grammarEntrySchema = z.object({
  slug,
  /** The pattern in Japanese, e.g. "N1 は N2 です". */
  pattern: z.string().min(1),
  meaning: localizedTextSchema,
  explanation: localizedTextSchema,
  examples: z
    .array(
      z.object({ ja: z.string().min(1), romaji: z.string().optional(), translation: localizedTextSchema }),
    )
    .min(1),
  commonErrors: z.array(localizedTextSchema).optional(),
  related: z.array(slug).optional(),
});

export const grammarFileSchema = z.object({
  source: z.string(),
  level: slug,
  items: z.array(grammarEntrySchema).min(1),
});

export type GrammarEntry = z.infer<typeof grammarEntrySchema>;

export interface GrammarItemData {
  slug: string;
  pattern: string;
  examples: { ja: string; romaji?: string }[];
  related: string[];
}

export interface GrammarTranslation {
  meaning: string;
  explanation: string;
  /** Translations of `examples`, in the same order. */
  examples: string[];
  commonErrors: string[];
}

export const grammarItemId = (slug: string) => `ja.grammar.${slug}`;
export const grammarItemKey = (slug: string) => `grammar:${slug}`;

export function isGrammarData(data: unknown): data is GrammarItemData {
  return typeof data === "object" && data !== null && typeof (data as GrammarItemData).pattern === "string";
}
