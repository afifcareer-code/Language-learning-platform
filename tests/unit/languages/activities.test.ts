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
      contentItemIds: ["ja.hiragana.ka", "ja.hiragana.ki"],
      characters: "か き",
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
