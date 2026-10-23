import { describe, expect, it } from "vitest";
import { validatePracticeSkill } from "@/core/practice";
import { japanese } from "@/languages/japanese";
import en from "../../../locales/en/practice.json";
import id from "../../../locales/id/practice.json";

const practice = japanese.practice!;

describe("Japanese practice framework", () => {
  it("defines the six skills, ordered by complexity", () => {
    expect(practice.skills.map((s) => s.id)).toEqual([
      "writing",
      "kanji",
      "reading",
      "listening",
      "vocabulary",
      "grammar",
    ]);
    expect(practice.skills.find((s) => s.id === "writing")!.stages.map((s) => s.id)).toEqual([
      "character",
      "word",
      "phrase",
      "sentence",
      "context",
      "free",
    ]);
  });

  it("is structurally valid and only uses skills the module can measure", () => {
    const skillIds = new Set(japanese.skills.map((s) => s.id));
    for (const skill of practice.skills) {
      expect(validatePracticeSkill(skill)).toEqual([]);
      for (const stage of skill.stages.filter((s) => s.availability === "available")) {
        expect(skillIds.has(stage.session!.skill), `${skill.id}/${stage.id}`).toBe(true);
      }
    }
  });

  it("never offers a stage that is planned, and does not claim handwriting recognition", () => {
    for (const skill of practice.skills) {
      for (const stage of skill.stages.filter((s) => s.availability === "planned")) {
        expect(stage.session).toBeUndefined();
      }
    }
    const strings = JSON.stringify(en.textWriting) + JSON.stringify(id.textWriting);
    expect(strings).toMatch(/does not read handwriting|tidak membaca tulisan tangan/);
  });

  it("is independent of the JLPT levels: no stage names a level", () => {
    expect(JSON.stringify(practice)).not.toMatch(/\bn[1-5]\b/i);
  });

  it("has a label for every skill, stage focus and reason in both interface languages", () => {
    for (const locale of [en, id]) {
      for (const skill of practice.skills) {
        expect(locale.skills, skill.id).toHaveProperty(skill.id);
        for (const stage of skill.stages) expect(locale.focus, stage.focus).toHaveProperty(stage.focus);
      }
    }
  });
});
