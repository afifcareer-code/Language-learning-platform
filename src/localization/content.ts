import { z } from "zod";
import { CONTENT_SOURCE_LOCALE, LOCALES, type Locale } from "./config";

/**
 * Authoring format for localized content in data files: one string per locale.
 * The source locale is required; other locales fall back to it at runtime,
 * and `missingLocales` lets content validation report gaps.
 */
export const localizedTextSchema = z
  .record(z.string(), z.string().min(1))
  .refine((v) => typeof v[CONTENT_SOURCE_LOCALE] === "string", {
    message: `A "${CONTENT_SOURCE_LOCALE}" text is required`,
  });

export type LocalizedText = z.infer<typeof localizedTextSchema>;

export function missingLocales(text: Record<string, unknown>): Locale[] {
  return LOCALES.filter((l) => typeof text[l] !== "string");
}

/** Replace {name} placeholders; unknown placeholders are left as they are. */
export function fillPlaceholders(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

/** Placeholders used in a template. */
export function placeholdersIn(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
}
