import { z } from "zod";
import { localizedTextSchema } from "@/localization/content";

/** Content type of native sentences (written by Japanese speakers) in the generic content store. */
export const NATIVE_CONTENT_TYPE = "ja.native";

const slug = z.string().regex(/^[a-z0-9-]+$/);

const credit = z.object({ id: z.number().int().positive(), author: z.string().min(1) });

/** Where a sentence comes from, kept with it because the licence requires attribution. */
export const nativeSourceSchema = z.object({
  name: z.literal("Tatoeba"),
  license: z.literal("CC BY 2.0 FR"),
  sentence: credit,
  /** The translation shown for each locale, credited to its own author. */
  translations: z.record(z.string(), credit),
});

/** A native sentence as authored in data/japanese/native/*.json (imported by scripts/content/import-tatoeba.py). */
export const nativeEntrySchema = z.object({
  slug,
  /** Hiragana and katakana only: the app does not teach kanji yet. */
  text: z.string().min(2),
  translation: localizedTextSchema,
  source: nativeSourceSchema,
});

export const nativeFileSchema = z.object({
  source: z.string(),
  level: slug,
  items: z.array(nativeEntrySchema).min(1),
});

export type NativeSource = z.infer<typeof nativeSourceSchema>;

export interface NativeItemData {
  slug: string;
  text: string;
  source: NativeSource;
}

export interface NativeTranslation {
  translation: string;
}

export const nativeItemId = (slug: string) => `ja.native.${slug}`;
export const nativeItemKey = (slug: string) => `native:${slug}`;

export function isNativeData(data: unknown): data is NativeItemData {
  const d = data as NativeItemData;
  return (
    typeof data === "object" && data !== null && typeof d.text === "string" && typeof d.source === "object"
  );
}

export const tatoebaSentenceUrl = (id: number) => `https://tatoeba.org/sentences/show/${id}`;
