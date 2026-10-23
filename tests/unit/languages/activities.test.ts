import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { expandLessonActivities } from "@/languages/japanese/curriculum/activities";
import { activityTemplateFileSchema } from "@/languages/japanese/curriculum/schema";

const templates = activityTemplateFileSchema.parse(
  JSON.parse(readFileSync("data/japanese/activities/kana.json", "utf8")),
);

describe("kana activity templates", () => {
  const activities = expandLessonActivities(
    {
      id: "ja.lesson.hiragana-k-row",
      slug: "hiragana-k-row",
      title: { en: "Hiragana: K row", id: "Hiragana: Baris K" },
      items: [],
    },
    templates,
    {
      itemsByType: { "ja.kana": { ids: ["ja.hiragana.ka", "ja.hiragana.ki"], characters: "か き" } },
      scriptName: { en: "Hiragana", id: "Hiragana" },
    },
  );

  it("creates one activity per template along the learning loop", () => {
    expect(activities.map((a) => a.definition.type)).toEqual(["recognition", "recall", "writing"]);
    expect(activities.map((a) => a.definition.id)).toEqual([
      "ja.activity.hiragana-k-row.recognition",
      "ja.activity.hiragana-k-row.recall",
      "ja.activity.hiragana-k-row.writing",
    ]);
    expect(activities.map((a) => a.definition.evaluation)).toEqual([
      "choice",
      "typed_response",
      "self_assessment_with_checks",
    ]);
  });

  it("gives every activity a measurable, localized objective with placeholders filled", () => {
    for (const { text } of activities) {
      for (const locale of ["en", "id"]) {
        expect(text[locale]?.objective).toContain("か き");
        expect(JSON.stringify(text[locale])).not.toMatch(/\{\w+\}/);
      }
    }
    expect(activities[2]!.text.id!.title).toBe("Menulis Hiragana か き");
    expect(activities[2]!.text.en!.title).toBe("Write Hiragana か き");
  });
});

describe("N5 lesson activity templates", () => {
  const n5 = activityTemplateFileSchema.parse(
    JSON.parse(readFileSync("data/japanese/activities/n5-lesson.json", "utf8")),
  );
  const lesson = {
    id: "ja.lesson.n5-01-introductions",
    slug: "n5-01-introductions",
    title: { en: "Introductions", id: "Perkenalan" },
    items: [],
  };

  it("uses each template only for the lesson's items of its content type", () => {
    const activities = expandLessonActivities(lesson, n5, {
      itemsByType: {
        "ja.vocabulary": { ids: ["ja.vocab.watashi", "ja.vocab.sensei"], characters: "わたし せんせい" },
        "ja.sentence": { ids: ["ja.sentence.watashi-gakusei"], characters: "" },
      },
    });
    expect(activities.map((a) => a.definition.type)).toEqual([
      "recognition",
      "recall",
      "sentence_building",
      "reading",
      "listening",
    ]);
    expect(activities[0]!.definition.contentItemIds).toEqual(["ja.vocab.watashi", "ja.vocab.sensei"]);
    expect(activities[2]!.definition.contentItemIds).toEqual(["ja.sentence.watashi-gakusei"]);
    for (const { text } of activities) expect(JSON.stringify(text)).not.toMatch(/\{\w+\}/);
  });

  it("skips templates whose content type the lesson does not have", () => {
    const activities = expandLessonActivities(lesson, n5, {
      itemsByType: { "ja.vocabulary": { ids: ["ja.vocab.watashi"], characters: "わたし" } },
    });
    expect(activities.map((a) => a.definition.type)).toEqual(["recognition", "recall"]);
    expect(activities.map((a) => a.definition.sortOrder)).toEqual([0, 1]);
  });
});
