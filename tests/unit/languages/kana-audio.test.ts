import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildChoices } from "@/core/activities";
import type { ContentItem } from "@/core/learning";
import { toPracticeItem } from "@/features/japanese/practice-items";
import {
  japanese,
  kanaFileSchema,
  kanaItemId,
  kanaItemKey,
  soundsAlike,
  type KanaItemData,
  type KanaScript,
} from "@/languages/japanese";
import { knownConfusables } from "@/languages/japanese/scripts/catalog";
import { LOCALES } from "@/localization/config";
import { getMessages } from "@/localization/messages";
import { createTranslator, type MessageTree } from "@/localization/translator";

/** Sound-first questions rely on every kana resolving to its character, reading and audio text. */

function load(script: KanaScript): ContentItem<KanaItemData>[] {
  const file = kanaFileSchema.parse(
    JSON.parse(readFileSync(`data/japanese/characters/${script}.json`, "utf8")),
  );
  return file.characters.map((c) => ({
    id: kanaItemId(script, c.romaji),
    languageCode: "ja",
    type: "ja.kana",
    key: kanaItemKey(script, c.kana),
    data: { script, ...c },
    tags: [],
  }));
}

const SCRIPTS: KanaScript[] = ["hiragana", "katakana"];
const all = SCRIPTS.flatMap(load);

/** A deterministic random source, so option building is reproducible. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const view = (item: ContentItem, kind: "recognition" | "recall" | "writing", choices: ContentItem[] = []) =>
  toPracticeItem(item, {
    kind,
    locale: "en",
    translation: undefined,
    choiceItems: choices.map((c) => ({ item: c, translation: undefined })),
    stage: "recall",
    scriptName: (script) => script,
  })!;

describe("kana audio metadata", () => {
  it("resolves character, reading, audio text and language for every kana", () => {
    expect(all).toHaveLength(208);
    for (const item of all) {
      const p = view(item, "recognition", [item]);
      expect(p.display, item.key).toBe(item.data.kana);
      // The sound that is played is the character itself, in Japanese: the audio target
      // is the question's target, never another item.
      expect(p.speech, item.key).toBe(item.data.kana);
      expect(p.speechLang).toBe("ja");
      expect(p.reading, item.key).toBe(item.data.romaji);
      expect(p.reading).toMatch(/^[a-z]+$/);
    }
  });

  it("asks sound → character only for recognition, so recall and writing are not mixed up with it", () => {
    const [a] = load("hiragana");
    expect(view(a!, "recognition").audioPrompt).toBe(true);
    expect(view(a!, "recall").audioPrompt).toBe(false);
    expect(view(a!, "writing").audioPrompt).toBe(false);
  });

  it("gives every option both its character (sound → character) and its sound (character → sound)", () => {
    const hiragana = load("hiragana");
    const target = hiragana[0]!;
    const p = view(target, "recognition", hiragana.slice(0, 4));
    expect(p.choices).toEqual(
      hiragana.slice(0, 4).map((c) => ({ id: c.id, label: c.data.romaji, glyph: c.data.kana })),
    );
    expect(p.choices.find((c) => c.id === target.id)).toMatchObject({ glyph: "あ", label: "a" });
  });
});

describe("kana that sound the same", () => {
  it("are exactly お/を, じ/ぢ, ず/づ (and their katakana), which a sound cannot tell apart", () => {
    const pairs: string[] = [];
    for (const a of all)
      for (const b of all)
        if (a.id < b.id && a.data.script === b.data.script && soundsAlike(a.data, b.data))
          pairs.push(`${a.data.kana}${b.data.kana}`);
    expect(pairs.sort()).toEqual(["おを", "オヲ", "ぢじ", "ヂジ", "づず", "ヅズ"].sort());
  });

  it("are never offered as options for each other", () => {
    const o = all.find((i) => i.data.kana === "お")!;
    const wo = all.find((i) => i.data.kana === "を")!;
    expect(japanese.isComparable?.(o, wo)).toBe(false);
    expect(japanese.isComparable?.(wo, o)).toBe(false);
    expect(
      japanese.isComparable?.(
        o,
        all.find((i) => i.data.kana === "あ")!,
      ),
    ).toBe(true);
  });
});

describe("answer options for sound → character", () => {
  const pool = (target: ContentItem) => all.filter((p) => japanese.isComparable!(target, p)).map((p) => p.id);

  it("always contain the target once, are unique, share the target's script and never sound alike", () => {
    for (const target of all) {
      for (let run = 0; run < 20; run++) {
        const options = buildChoices(
          target.id,
          pool(target),
          knownConfusables(target.id),
          4,
          seeded(run * 7919 + target.id.length),
        );
        expect(options, target.key).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options.filter((id) => id === target.id)).toHaveLength(1);
        for (const id of options) {
          const other = all.find((i) => i.id === id)!;
          expect(other.data.script).toBe(target.data.script);
          if (id !== target.id) {
            expect(soundsAlike(target.data, other.data), `${target.key} vs ${other.key}`).toBe(false);
          }
        }
      }
    }
  });

  it("use commonly confused characters first, and do not always put the answer in the same place", () => {
    const shi = all.find((i) => i.key === "katakana:シ")!;
    const positions = new Set<number>();
    for (let run = 0; run < 30; run++) {
      const options = buildChoices(shi.id, pool(shi), knownConfusables(shi.id), 4, seeded(run * 7919 + 13));
      expect(options).toContain(kanaItemId("katakana", "tsu"));
      expect(options).toContain(kanaItemId("katakana", "n"));
      positions.add(options.indexOf(shi.id));
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe("kana activity copy states what to do", () => {
  const file = JSON.parse(readFileSync("data/japanese/activities/kana.json", "utf8")) as {
    templates: {
      key: string;
      skill: string;
      successCriteria: string[];
      text: Record<string, { instruction: string; objective: string }>;
    }[];
  };
  const by = Object.fromEntries(file.templates.map((t) => [t.key, t]));

  it("makes each stage test a different skill, in the direction its instruction says", () => {
    expect(file.templates.map((t) => t.skill)).toEqual([
      "ja.kana.recognition",
      "ja.kana.reading",
      "ja.kana.writing",
    ]);
    expect(by.recognition!.successCriteria).toEqual(["audio_recognition", "recognition"]);
    expect(by.recall!.successCriteria).toContain("sound_recall");
    expect(by.writing!.successCriteria).toContain("stroke_count");
    expect(by.recognition!.text.en!.instruction).toBe(
      "Listen to the sound, then choose the matching character.",
    );
    expect(by.recognition!.text.id!.instruction).toBe("Dengarkan bunyinya, lalu pilih karakter yang sesuai.");
  });

  it("never asks the learner to listen in recall, where the sound is the answer", () => {
    expect(by.recall!.text.en!.instruction).not.toMatch(/listen/i);
    expect(by.recall!.text.id!.instruction).not.toMatch(/dengar/i);
    expect(by.writing!.text.en!.instruction).toMatch(/listen/i);
    expect(by.writing!.text.id!.instruction).toMatch(/dengar/i);
  });

  it("gives every stage an instruction in every locale", () => {
    for (const locale of LOCALES) {
      for (const t of file.templates) expect(t.text[locale]!.instruction.length).toBeGreaterThan(20);
    }
  });
});

describe("audio copy is localized", () => {
  const keys = [
    "common.audio.playSound",
    "common.audio.playAgain",
    "common.audio.playing",
    "common.audio.preparing",
    "practice.recognition.audioPrompt",
    "practice.recognition.audioQuestion",
    "practice.recognition.visualPrompt",
    "practice.recognition.noAudio",
    "practice.recall.label",
    "practice.feedback.incorrect",
    "practice.feedback.audioCorrect",
    "practice.feedback.audioIncorrect",
    "practice.feedback.confusedWithChosen",
    "practice.writing.instruction",
    "practice.writing.instructionVisual",
    "learning.lesson.tapToHear",
  ];

  it.each(LOCALES)("%s has every key used by the sound-first activities", (locale) => {
    const t = createTranslator(locale, getMessages(locale) as MessageTree);
    for (const key of keys) {
      const text = t.dynamic(key.split("."), { item: "あ" }, "");
      expect(text, `${locale}: ${key}`).not.toBe("");
      expect(text).not.toBe(key);
    }
  });

  it("states the direction in the learner's language", () => {
    const en = createTranslator("en", getMessages("en") as MessageTree);
    const id = createTranslator("id", getMessages("id") as MessageTree);
    expect(en.dynamic(["practice", "recognition", "audioPrompt"], undefined, "")).toBe(
      "Listen to the sound, then choose the matching character.",
    );
    expect(id.dynamic(["practice", "recognition", "audioPrompt"], undefined, "")).toBe(
      "Dengarkan bunyinya, lalu pilih karakter yang sesuai.",
    );
  });
});
