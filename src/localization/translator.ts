import { FALLBACK_LOCALE, INTL_LOCALE, type Locale } from "./config";

/**
 * A small, dependency-free translator.
 *
 * - Messages are nested JSON objects; keys are dot paths ("dashboard.title").
 * - `{name}` placeholders are interpolated.
 * - A message may be a plural object ({ "one": "…", "other": "…" }), chosen
 *   with Intl.PluralRules from the `count` variable.
 * - Missing messages fall back to the fallback locale, then to the key itself.
 */

export type MessageTree = { [key: string]: string | MessageTree };
export type Vars = Record<string, string | number>;

type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** Dot paths to every translatable leaf of a message tree (plural objects are leaves). */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends { other: string }
      ? K
      : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

function isPlural(node: unknown): node is PluralForms {
  return typeof node === "object" && node !== null && typeof (node as PluralForms).other === "string";
}

function walk(tree: MessageTree | undefined, path: readonly string[]): unknown {
  let node: unknown = tree;
  for (const segment of path) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as MessageTree)[segment];
  }
  return node;
}

function interpolate(template: string, vars: Vars | undefined, format: (n: number) => string): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    if (value === undefined) return match;
    return typeof value === "number" ? format(value) : value;
  });
}

export interface Translator<T> {
  locale: Locale;
  intlLocale: string;
  /** Translate a known key. */
  (key: MessageKey<T>, vars?: Vars): string;
  /** Translate a key built at runtime (e.g. from a skill id); returns `fallback` when missing. */
  dynamic(path: readonly string[], vars?: Vars, fallback?: string): string;
  has(path: readonly string[]): boolean;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  percent(ratio: number): string;
  date(value: Date, options?: Intl.DateTimeFormatOptions): string;
  relativeTime(target: Date, now?: Date): string;
}

export function createTranslator<T extends MessageTree>(
  locale: Locale,
  messages: T,
  fallbackMessages?: MessageTree,
): Translator<T> {
  const intlLocale = INTL_LOCALE[locale];
  const plural = new Intl.PluralRules(intlLocale);
  const numberFormat = new Intl.NumberFormat(intlLocale);
  const format = (n: number) => numberFormat.format(n);

  const resolve = (path: readonly string[], vars?: Vars): string | undefined => {
    for (const tree of [messages, locale === FALLBACK_LOCALE ? undefined : fallbackMessages]) {
      const node = walk(tree, path);
      if (typeof node === "string") return interpolate(node, vars, format);
      if (isPlural(node)) {
        const count = typeof vars?.count === "number" ? vars.count : 0;
        return interpolate(node[plural.select(count)] ?? node.other, vars, format);
      }
    }
    return undefined;
  };

  const t = ((key: string, vars?: Vars) => resolve(key.split("."), vars) ?? key) as Translator<T>;
  t.locale = locale;
  t.intlLocale = intlLocale;
  t.dynamic = (path, vars, fallback) => resolve(path, vars) ?? fallback ?? path.join(".");
  t.has = (path) => resolve(path) !== undefined;
  t.number = (value, options) => new Intl.NumberFormat(intlLocale, options).format(value);
  t.percent = (ratio) =>
    new Intl.NumberFormat(intlLocale, { style: "percent", maximumFractionDigits: 0 }).format(ratio);
  t.date = (value, options = { dateStyle: "medium", timeStyle: "short" }) =>
    new Intl.DateTimeFormat(intlLocale, options).format(value);
  t.relativeTime = (target, now = new Date()) => {
    const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });
    const seconds = (target.getTime() - now.getTime()) / 1000;
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ["day", 86_400],
      ["hour", 3_600],
      ["minute", 60],
    ];
    for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
    }
    return rtf.format(Math.round(seconds / 60), "minute");
  };
  return t;
}
