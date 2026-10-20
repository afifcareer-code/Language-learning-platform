import { describe, expect, it } from "vitest";
import type { ContentItem } from "@/core/learning";
import { checkRomaji, japanese, JA_SKILLS, normalizeRomaji, type KanaItemData } from "@/languages/japanese";
import { getLanguageModule } from "@/languages/registry";
import { LOCALES } from "@/localization/config";

const shi: KanaItemData = {
  script: "hiragana",
  kana: "し",
  romaji: "shi",
  alternateRomaji: ["si"],
  row: "sa",
  strokeCount: 1,
};
const item: ContentItem<KanaItemData> = {
  id: "ja.hiragana.shi",
  languageCode: "ja",
  type: "ja.kana",
  key: "hiragana:し",
  data: shi,
  tags: [],
};

describe("romaji checking", () => {
  it("accepts canonical and alternate romanisations, case- and space-insensitively", () => {
    expect(checkRomaji(shi, "shi")).toBe(true);
    expect(checkRomaji(shi, " SI ")).toBe(true);
    expect(checkRomaji(shi, "chi")).toBe(false);
    expect(checkRomaji(shi, "")).toBe(false);
  });

  it("strips diacritics", () => {
    expect(normalizeRomaji("Ō")).toBe("o");
  });
});

describe("japanese module", () => {
  it("is registered", () => {
    expect(getLanguageModule("ja")).toBe(japanese);
  });

  it("declares skills for capabilities it supports", () => {
    for (const skill of japanese.skills) expect(japanese.capabilities).toContain(skill.capability);
  });

  it("grades kana reading and reports the expected answer", () => {
    expect(japanese.evaluateResponse(item, JA_SKILLS.kanaReading, "shi")).toMatchObject({
      correct: true,
      score: 1,
      expected: "shi",
    });
    expect(japanese.evaluateResponse(item, JA_SKILLS.kanaReading, "zzz")).toMatchObject({
      correct: false,
      confusedWithItemId: undefined,
    });
  });

  it("detects which other character a wrong reading belongs to", () => {
    // Typing "su" for し means the learner read it as す.
    expect(japanese.evaluateResponse(item, JA_SKILLS.kanaReading, "su")?.confusedWithItemId).toBe(
      "ja.hiragana.su",
    );
    expect(japanese.evaluateResponse(item, JA_SKILLS.kanaReading, "TU")?.confusedWithItemId).toBe(
      "ja.hiragana.tsu",
    );
  });

  it("knows commonly confused characters and only compares within a script", () => {
    expect(japanese.knownConfusables?.("ja.katakana.shi")).toContain("ja.katakana.tsu");
    const kata = {
      ...item,
      id: "ja.katakana.shi",
      data: { ...shi, script: "katakana" as const, kana: "シ" },
    };
    expect(japanese.isComparable?.(item, item)).toBe(true);
    expect(japanese.isComparable?.(item, kata)).toBe(false);
  });

  it("provides a localized label for every skill in every platform locale", () => {
    for (const locale of LOCALES) {
      const messages = japanese.messages[locale] as { skills: Record<string, { label: string }> };
      for (const skill of japanese.skills) expect(messages.skills[skill.id]?.label).toBeTruthy();
    }
  });

  it("does not auto-grade skills it cannot grade from text", () => {
    expect(japanese.evaluateResponse(item, JA_SKILLS.kanaWriting, "shi")).toBeNull();
  });
});
