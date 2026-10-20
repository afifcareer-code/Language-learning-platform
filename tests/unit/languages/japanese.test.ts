import { describe, expect, it } from "vitest";
import type { ContentItem } from "@/core/learning";
import { checkRomaji, japanese, JA_SKILLS, normalizeRomaji, type KanaItemData } from "@/languages/japanese";
import { getLanguageModule } from "@/languages/registry";

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
    expect(japanese.evaluateResponse(item, JA_SKILLS.kanaReading, "shi")).toEqual({
      correct: true,
      score: 1,
      expected: "shi",
    });
    expect(japanese.evaluateResponse(item, JA_SKILLS.kanaReading, "su")?.correct).toBe(false);
  });

  it("does not auto-grade skills it cannot grade from text", () => {
    expect(japanese.evaluateResponse(item, JA_SKILLS.kanaWriting, "shi")).toBeNull();
  });
});
