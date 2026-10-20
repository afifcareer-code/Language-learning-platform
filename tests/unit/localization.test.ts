import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { japanese } from "@/languages/japanese";
import { CONTENT_SOURCE_LOCALE, LOCALES, negotiateLocale, pickTranslation } from "@/localization/config";
import { fillPlaceholders, missingLocales } from "@/localization/content";
import { getMessages } from "@/localization/messages";
import { createTranslator, type MessageTree } from "@/localization/translator";

/** Leaf paths of a message tree as segment lists (keys may contain dots); plural objects count as one leaf. */
function leafPaths(tree: unknown, prefix: string[] = []): string[][] {
  if (typeof tree === "string") return [prefix];
  const node = tree as Record<string, unknown>;
  if (typeof node.other === "string") return [prefix];
  return Object.entries(node).flatMap(([k, v]) => leafPaths(v, [...prefix, k]));
}

const show = (path: string[]) => path.join(" › ");

describe("translator", () => {
  const en = {
    a: { hello: "Hello, {name}", items: { one: "{count} item", other: "{count} items" } },
    only: "en only",
  };
  const id = { a: { hello: "Halo, {name}", items: { other: "{count} item" } } };

  it("interpolates and selects plural forms with Intl.PluralRules", () => {
    const t = createTranslator("en", en);
    expect(t("a.hello", { name: "Aiko" })).toBe("Hello, Aiko");
    expect(t("a.items", { count: 1 })).toBe("1 item");
    expect(t("a.items", { count: 1200 })).toBe("1,200 items");
    expect(createTranslator("id", id as unknown as typeof en)("a.items", { count: 3 })).toBe("3 item");
  });

  it("falls back to English, then to the key", () => {
    const t = createTranslator("id", id as unknown as typeof en, en);
    expect(t("only")).toBe("en only");
    expect(t.dynamic(["missing", "key"])).toBe("missing.key");
    expect(t.dynamic(["missing"], undefined, "fallback")).toBe("fallback");
  });

  it("formats numbers, percentages and relative times per locale", () => {
    const t = createTranslator("id", id as unknown as typeof en);
    expect(t.percent(0.5)).toBe("50%");
    const now = new Date("2026-01-01T00:00:00Z");
    expect(t.relativeTime(new Date("2026-01-02T00:00:00Z"), now)).toBe("besok");
    expect(createTranslator("en", en).relativeTime(new Date("2026-01-02T00:00:00Z"), now)).toBe("tomorrow");
  });
});

describe("locale negotiation", () => {
  it("picks the best supported locale from Accept-Language", () => {
    expect(negotiateLocale("id-ID,id;q=0.9,en-US;q=0.8")).toBe("id");
    expect(negotiateLocale("fr-FR,en;q=0.5")).toBe("en");
    expect(negotiateLocale("in-ID")).toBe("id");
    expect(negotiateLocale("fr")).toBeNull();
    expect(negotiateLocale(null)).toBeNull();
  });

  it("falls back to the source locale for content translations", () => {
    const rows = [
      { locale: "en", title: "Write" },
      { locale: "id", title: "Tulis" },
    ];
    expect(pickTranslation(rows, "id")?.title).toBe("Tulis");
    expect(pickTranslation([rows[0]!], "id")?.title).toBe("Write");
  });

  it("fills content placeholders and reports missing translations", () => {
    expect(fillPlaceholders("Write {characters} {unknown}", { characters: "あ い" })).toBe(
      "Write あ い {unknown}",
    );
    expect(missingLocales({ [CONTENT_SOURCE_LOCALE]: "x" })).toEqual(
      LOCALES.filter((l) => l !== CONTENT_SOURCE_LOCALE),
    );
  });
});

describe("locale files", () => {
  const reference = leafPaths(getMessages("en"));

  it.each(LOCALES)("%s defines exactly the same messages as English", (locale) => {
    expect(leafPaths(getMessages(locale)).map(show).sort()).toEqual(reference.map(show).sort());
  });

  it("registers every namespace file found in /locales", () => {
    for (const locale of LOCALES) {
      const files = readdirSync(join(process.cwd(), "locales", locale)).map((f) => f.replace(/\.json$/, ""));
      expect(
        Object.keys(getMessages(locale))
          .filter((k) => k !== japanese.code)
          .sort(),
      ).toEqual(files.sort());
    }
  });

  it("uses the same placeholders in every translation", () => {
    const placeholders = (tree: MessageTree, path: string[]) => [
      ...new Set(
        JSON.stringify(path.reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], tree) ?? "")
          .match(/\{\w+\}/g)
          ?.sort() ?? [],
      ),
    ];
    for (const locale of LOCALES) {
      for (const path of reference) {
        expect([show(path), ...placeholders(getMessages(locale), path)]).toEqual([
          show(path),
          ...placeholders(getMessages("en"), path),
        ]);
      }
    }
  });

  it("are valid JSON with no empty strings", () => {
    for (const locale of LOCALES) {
      for (const file of readdirSync(join(process.cwd(), "locales", locale))) {
        const text = readFileSync(join(process.cwd(), "locales", locale, file), "utf8");
        expect(text).not.toMatch(/:\s*""/);
      }
    }
  });
});
