import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentItem } from "@/core/learning";
import { toPracticeItem, type PracticeItem } from "@/features/japanese/practice-items";
import { introductionItems } from "@/features/practice/introduction";
import { LOCALES } from "@/localization/config";
import { getMessages } from "@/localization/messages";
import { createTranslator, type MessageTree } from "@/localization/translator";
import { kanaFileSchema, kanaItemId, kanaItemKey } from "@/languages/japanese";

const file = kanaFileSchema.parse(JSON.parse(readFileSync("data/japanese/characters/hiragana.json", "utf8")));
const content: ContentItem[] = file.characters.map((c) => ({
  id: kanaItemId("hiragana", c.romaji),
  languageCode: "ja",
  type: "ja.kana",
  key: kanaItemKey("hiragana", c.kana),
  data: { script: "hiragana", ...c },
  tags: [],
}));

const practice = (items: ContentItem[]): PracticeItem[] =>
  items.map((item) =>
    toPracticeItem(item, {
      kind: "recognition",
      locale: "en",
      translation: undefined,
      choiceItems: [],
      stage: "full_example",
      scriptName: (s) => s,
    })!,
  );

const vowels = content.slice(0, 5);
const ids = vowels.map((v) => v.id);

describe("introduction before the first question", () => {
  it("introduces every new character with its character, reading and sound, in the lesson's order", () => {
    // The session's prompts are shuffled; the introduction follows the lesson.
    const shuffled = practice([vowels[3]!, vowels[0]!, vowels[4]!, vowels[1]!, vowels[2]!]);
    const intro = introductionItems(ids, shuffled, new Set());
    expect(intro.map((i) => i.display)).toEqual(["あ", "い", "う", "え", "お"]);
    expect(intro.map((i) => i.reading)).toEqual(["a", "i", "u", "e", "o"]);
    for (const item of intro) {
      expect(item.speech).toBe(item.display);
      expect(item.speechLang).toBe("ja");
      expect(item.displayLang).toBe("ja");
    }
  });

  it("is resolved from the content data, not written by hand: it follows whatever the data says", () => {
    const [a] = vowels;
    const changed: ContentItem = { ...a!, data: { ...(a!.data as object), romaji: "ah" } };
    expect(introductionItems([a!.id], practice([changed]), new Set())[0]?.reading).toBe("ah");
  });

  it("skips characters the learner has already practiced in any skill", () => {
    const intro = introductionItems(ids, practice(vowels), new Set([ids[0]!, ids[2]!]));
    expect(intro.map((i) => i.display)).toEqual(["い", "え", "お"]);
    expect(introductionItems(ids, practice(vowels), new Set(ids))).toEqual([]);
  });

  it("introduces nothing that has no single reading to show", () => {
    const word = { ...practice([vowels[0]!])[0]!, reading: "" };
    expect(introductionItems([word.id], [word], new Set())).toEqual([]);
  });
});

describe("introduction and writing result copy is localized", () => {
  const keys = [
    "practice.introduction.title",
    "practice.introduction.prompt",
    "practice.introduction.readAs",
    "practice.introduction.noAudio",
    "practice.introduction.group",
    "practice.introduction.next",
    "practice.introduction.start",
    "practice.writing.compare",
    "practice.writing.self.correct",
    "practice.writing.self.incorrect",
    "practice.writing.result.label",
    "practice.writing.result.characterCorrect",
    "practice.writing.result.characterIncorrect",
    "practice.writing.result.shapeLabel",
    "practice.writing.result.quality.excellent",
    "practice.writing.result.quality.good",
    "practice.writing.result.quality.needs_improvement",
    "practice.writing.result.quality.incorrect",
    "practice.writing.result.retry",
    "practice.writing.result.improve",
    "practice.writing.result.continueAnyway",
    "practice.writing.result.continue",
    "common.shell.changeLanguageShort",
    "common.shell.changeLearningLanguage",
  ];

  it.each(LOCALES)("%s has every key", (locale) => {
    const t = createTranslator(locale, getMessages(locale) as MessageTree);
    for (const key of keys) {
      const text = t.dynamic(key.split("."), { character: "あ", reading: "a", from: 1, to: 5, total: 5 }, "");
      expect(text, `${locale}: ${key}`).not.toBe("");
      expect(text).not.toBe(key);
    }
  });

  it("says the same things in the learner's language", () => {
    const en = createTranslator("en", getMessages("en") as MessageTree);
    const id = createTranslator("id", getMessages("id") as MessageTree);
    const get = (t: typeof en, key: string) => t.dynamic(key.split("."), { character: "あ" }, "");
    expect(get(id, "practice.writing.result.improve")).toBe("Perbaiki tulisan");
    expect(get(id, "practice.writing.result.continueAnyway")).toBe("Tetap lanjut");
    expect(get(en, "practice.writing.result.improve")).toBe("Improve writing");
    expect(get(en, "practice.writing.result.continueAnyway")).toBe("Continue anyway");
    expect(get(id, "practice.writing.result.quality.needs_improvement")).toBe(
      "Karakter benar, tetapi bentuk tulisan masih perlu diperbaiki.",
    );
    expect(get(en, "practice.writing.result.quality.needs_improvement")).toBe(
      "The character is correct, but the handwriting can be more precise.",
    );
  });
});
