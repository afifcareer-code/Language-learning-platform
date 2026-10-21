import { describe, expect, it } from "vitest";
import type { ContentItem } from "@/core/learning";
import { activityGroup } from "@/core/activities";
import { readinessOfPairs } from "@/core/analytics";
import { japanese, JA_SKILLS } from "@/languages/japanese";
import { tokensMatchText, type SentenceItemData } from "@/languages/japanese/sentences/schema";
import { checkVocabularyAnswer } from "@/languages/japanese/vocabulary/answers";
import type { VocabularyItemData } from "@/languages/japanese/vocabulary/schema";
import type { Curriculum } from "@/server/repositories/curriculum";
import { learningPath } from "@/server/services/learning-path";

const sensei: VocabularyItemData = {
  kana: "せんせい",
  kanji: "先生",
  romaji: "sensei",
  partOfSpeech: "noun",
};
const yoroshiku: VocabularyItemData = {
  kana: "よろしく おねがいします",
  romaji: "yoroshiku onegaishimasu",
  partOfSpeech: "expression",
};
const san: VocabularyItemData = { kana: "さん", romaji: "san", affix: "suffix", partOfSpeech: "suffix" };

const item = <T>(id: string, type: string, data: T): ContentItem<T> => ({
  id,
  languageCode: "ja",
  type,
  key: id,
  data,
  tags: [],
});

describe("vocabulary answers", () => {
  it("accepts kana, kanji or romaji, ignoring spacing, case, hyphens and the 〜 marker", () => {
    expect(checkVocabularyAnswer(sensei, "せんせい")).toBe(true);
    expect(checkVocabularyAnswer(sensei, "先生")).toBe(true);
    expect(checkVocabularyAnswer(sensei, " Sensei ")).toBe(true);
    expect(checkVocabularyAnswer(yoroshiku, "よろしくおねがいします")).toBe(true);
    expect(checkVocabularyAnswer(yoroshiku, "yoroshiku-onegaishimasu")).toBe(true);
    expect(checkVocabularyAnswer(san, "〜さん")).toBe(true);
  });

  it("rejects other words and empty answers", () => {
    expect(checkVocabularyAnswer(sensei, "がくせい")).toBe(false);
    expect(checkVocabularyAnswer(sensei, "gakusei")).toBe(false);
    expect(checkVocabularyAnswer(sensei, "   ")).toBe(false);
  });

  it("is graded by the Japanese module for vocabulary recall, with the expected word and romaji", () => {
    const result = japanese.evaluateResponse(
      item("ja.vocab.sensei", "ja.vocabulary", sensei),
      JA_SKILLS.vocabularyRecall,
      "x",
    );
    expect(result).toMatchObject({ correct: false, score: 0, expected: "せんせい (sensei)" });
  });
});

describe("sentence building", () => {
  const sentence: SentenceItemData = {
    slug: "watashi-gakusei",
    text: "わたしは がくせいです。",
    tokens: ["わたし", "は", "がくせい", "です"],
    grammar: "n5-wa-desu",
  };
  const evaluate = (answer: string) =>
    japanese.evaluateResponse(
      item("ja.sentence.watashi-gakusei", "ja.sentence", sentence),
      JA_SKILLS.sentenceBuilding,
      answer,
    );

  it("is correct only when every piece is in order", () => {
    expect(evaluate("わたし は がくせい です")).toMatchObject({
      correct: true,
      expected: "わたしは がくせいです。",
    });
    expect(evaluate("は わたし がくせい です")?.correct).toBe(false);
    expect(evaluate("わたし は がくせい")?.correct).toBe(false);
  });

  it("checks that the pieces spell the sentence", () => {
    expect(tokensMatchText(sentence)).toBe(true);
    expect(tokensMatchText({ ...sentence, tokens: ["わたし", "が", "がくせい", "です"] })).toBe(false);
  });
});

describe("lesson structure", () => {
  it("groups activities into practice (recognize, recall) and apply (produce)", () => {
    expect(activityGroup("recognition")).toBe("practice");
    expect(activityGroup("recall")).toBe("practice");
    expect(activityGroup("writing")).toBe("apply");
    expect(activityGroup("sentence_building")).toBe("apply");
  });

  it("measures readiness on the item and skill each activity trains", () => {
    const states: Record<string, "practicing" | "not_started"> = {
      "a|read": "practicing",
      "b|read": "practicing",
    };
    const r = readinessOfPairs(
      [
        { itemId: "a", skill: "read" },
        { itemId: "b", skill: "read" },
        { itemId: "s", skill: "build" },
      ],
      (id, skill) => states[`${id}|${skill}`] ?? "not_started",
    );
    expect(r).toMatchObject({ ready: 2, total: 3, isReady: false });
  });
});

describe("learning path", () => {
  const level = (id: string, activityIds: string[]) => ({
    id,
    slug: id,
    frameworkLevel: null,
    title: id,
    description: null,
    courses: activityIds.length
      ? [
          {
            id: `${id}.course`,
            slug: id,
            title: id,
            description: null,
            lessons: [
              {
                id: `${id}.lesson`,
                slug: id,
                title: id,
                objective: null,
                situation: null,
                itemIds: [],
                activities: activityIds.map((a) => ({ id: a }) as never),
              },
            ],
          },
        ]
      : [],
  });
  const curriculum = {
    levels: [level("foundation", ["f1", "f2"]), level("n5", ["n1"]), level("n4", [])],
    lessons: [],
    activities: [],
  } as unknown as Curriculum;
  const statuses = (done: string[]) => new Map(done.map((id) => [id, "completed" as const]));

  it("marks the current level, available levels and levels in development", () => {
    expect(learningPath(curriculum, statuses([]), "foundation").map((p) => p.status)).toEqual([
      "current",
      "available",
      "locked",
    ]);
  });

  it("recommends the next level once the current one is completed", () => {
    expect(learningPath(curriculum, statuses(["f1", "f2"]), "foundation").map((p) => p.status)).toEqual([
      "current",
      "recommended",
      "locked",
    ]);
  });

  it("shows levels the learner left as in progress or completed", () => {
    expect(learningPath(curriculum, statuses(["f1"]), "n5").map((p) => p.status)).toEqual([
      "in_progress",
      "current",
      "locked",
    ]);
    expect(learningPath(curriculum, statuses(["f1", "f2"]), "n5")[0]).toMatchObject({
      status: "completed",
      completedActivities: 2,
      totalActivities: 2,
    });
  });
});
