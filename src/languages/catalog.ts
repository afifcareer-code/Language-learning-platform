import { z } from "zod";

/**
 * The platform's language catalog (data/languages.json): which languages are
 * offered now and which are planned. It is separate from language modules:
 * a planned language has catalog metadata but no module and no curriculum.
 */

export const LANGUAGE_STATUSES = ["available", "coming_soon"] as const;
export type LanguageStatus = (typeof LANGUAGE_STATUSES)[number];

export const languageCatalogSchema = z.object({
  source: z.string(),
  languages: z
    .array(
      z.object({
        /** BCP 47 code, e.g. "ja". */
        code: z.string().regex(/^[a-z]{2,3}$/),
        /** English name, stored for reference; the UI uses localized names. */
        name: z.string().min(1),
        /** The language's name in itself, e.g. "日本語". Used as its visual mark. */
        nativeName: z.string().min(1),
        status: z.enum(LANGUAGE_STATUSES),
        writingSystem: z.string().regex(/^[a-z_]+$/),
        proficiencyFramework: z.string().regex(/^[a-z]+$/),
      }),
    )
    .min(1),
});

export type LanguageCatalog = z.infer<typeof languageCatalogSchema>;
export type CatalogLanguage = LanguageCatalog["languages"][number];
