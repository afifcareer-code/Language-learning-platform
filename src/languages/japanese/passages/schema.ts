import { z } from "zod";
import { stripRuby } from "../ruby";

/** Content type of reading texts and dialogues in the generic content store. */
export const PASSAGE_CONTENT_TYPE = "ja.passage";

/**
 * text: a short original text; dialogue: heard, not read; paragraph and authentic: excerpts of
 * published writing (with furigana in `lines`), at the Paragraph and Real-world practice stages.
 */
export const PASSAGE_FORMS = ["text", "dialogue", "paragraph", "authentic"] as const;
export type PassageForm = (typeof PASSAGE_FORMS)[number];

const slug = z.string().regex(/^[a-z0-9-]+$/);

const comprehension = z.object({
  question: z.string().min(2),
  /** Four options, in the same order as every other locale. The correct one is `answer`. */
  options: z.array(z.string().min(1)).length(4),
  /** What the text says, shown after the answer. Required for authentic texts. */
  gloss: z.string().min(2).optional(),
});

/** Where an authentic text comes from; shown with it. */
export const passageCreditSchema = z.object({
  author: z.string().min(1),
  work: z.string().min(1),
  url: z.string().url(),
  license: z.string().min(1),
});

/**
 * A short text to read, or a dialogue to listen to, with one comprehension question.
 * As authored in data/japanese/passages/*.json. Passages are original.
 */
export const passageEntrySchema = z
  .object({
    slug,
    form: z.enum(PASSAGE_FORMS),
    /** Only for texts that are not ours. */
    credit: passageCreditSchema.optional(),
    lines: z.array(z.object({ speaker: z.string().optional(), text: z.string().min(2) })).min(1),
    /** Index (0-3) of the correct option, identical in every locale. */
    answer: z.number().int().min(0).max(3),
    comprehension: z.record(z.string(), comprehension),
  })
  .refine((p) => typeof p.comprehension.en === "object", { message: 'An "en" question is required' });

export const passageFileSchema = z.object({
  source: z.string(),
  level: slug,
  items: z.array(passageEntrySchema).min(1),
});

export interface PassageItemData {
  slug: string;
  form: PassageForm;
  lines: { speaker?: string; text: string }[];
  answer: number;
  credit?: z.infer<typeof passageCreditSchema>;
}

export interface PassageTranslation {
  question: string;
  options: string[];
  gloss?: string;
}

export const passageItemId = (slug: string) => `ja.passage.${slug}`;
export const passageItemKey = (slug: string) => `passage:${slug}`;

export function isPassageData(data: unknown): data is PassageItemData {
  const d = data as PassageItemData;
  return typeof data === "object" && data !== null && Array.isArray(d.lines) && "form" in d;
}

/** What is spoken for a passage: its lines in order. One clip per passage. */
export function passageSpeech(data: Pick<PassageItemData, "lines">): string {
  return data.lines.map((l) => stripRuby(l.text)).join(" ");
}
