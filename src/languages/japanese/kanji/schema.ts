import { z } from "zod";
import { localizedTextSchema } from "@/localization/content";

/**
 * Kanji model, prepared for the curriculum but not populated yet.
 * Stroke data must come from a license-compatible source before it is added.
 */
export const KANJI_CONTENT_TYPE = "ja.kanji";

export const kanjiEntrySchema = z.object({
  character: z.string().length(1),
  meanings: localizedTextSchema,
  onyomi: z.array(z.string().min(1)),
  kunyomi: z.array(z.string().min(1)),
  strokeCount: z.number().int().positive(),
  /** Vocabulary keys that use this kanji, e.g. "vocabulary:がくせい". */
  vocabulary: z.array(z.string()).optional(),
});

export const kanjiFileSchema = z.object({
  source: z.string(),
  level: z.string().regex(/^[a-z0-9-]+$/),
  items: z.array(kanjiEntrySchema).min(1),
});

export type KanjiEntry = z.infer<typeof kanjiEntrySchema>;
