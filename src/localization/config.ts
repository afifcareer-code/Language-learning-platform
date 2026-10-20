/**
 * Platform (UI) locales. These are independent of the language being
 * learned: a learner can study Japanese with an Indonesian or English UI.
 */
export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];

/** Used when nothing else matches. */
export const FALLBACK_LOCALE: Locale = "en";

/** Content is authored in this locale first; translations fall back to it. */
export const CONTENT_SOURCE_LOCALE: Locale = "en";

/** Each locale's name in its own language, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", id: "Bahasa Indonesia" };

/** BCP 47 tag used for Intl formatting. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en", id: "id-ID" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Pick the best supported locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((e) => e.tag && !Number.isNaN(e.q) && e.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    // "in" is the legacy ISO code for Indonesian still sent by some devices.
    const normalized = base === "in" ? "id" : base;
    if (isLocale(normalized)) return normalized;
  }
  return null;
}

/**
 * Choose the record for `locale` from translations, falling back to the
 * content source locale and then to any available translation.
 */
export function pickTranslation<T extends { locale: string }>(
  rows: readonly T[],
  locale: Locale,
): T | undefined {
  return (
    rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === CONTENT_SOURCE_LOCALE) ?? rows[0]
  );
}
