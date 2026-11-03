import { describe, expect, it } from "vitest";
import { parseRuby, stripRuby } from "@/languages/japanese/ruby";

describe("furigana notation", () => {
  it("attaches a reading to the kanji before it", () => {
    expect(parseRuby("これは、私《わたし》が")).toEqual([
      { text: "これは、" },
      { text: "私", reading: "わたし" },
      { text: "が" },
    ]);
  });

  it("uses the marked base when the reading covers only part of the run", () => {
    expect(parseRuby("丁度｜地獄《じごく》の")).toEqual([
      { text: "丁度" },
      { text: "地獄", reading: "じごく" },
      { text: "の" },
    ]);
  });

  it("strips readings for speech and comparison", () => {
    expect(stripRuby("洞穴《ほらあな》から子供の狐《きつね》が")).toBe("洞穴から子供の狐が");
    expect(stripRuby("十｜米《メートル》も")).toBe("十米も");
  });
});

describe("furigana in lesson sentences", () => {
  it("reads and writes out the readings", async () => {
    const { rubyReading, rubyInline } = await import("@/languages/japanese/ruby");
    expect(rubyReading("毎日《まいにち》 電車《でんしゃ》で 行《い》きます。")).toBe(
      "まいにち でんしゃで いきます。",
    );
    expect(rubyInline("食《た》べます")).toBe("食(た)べます");
  });

  it("uses only kanji taught in the same lesson or before it", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
    const sentences = new Map<string, string>();
    for (const f of readdirSync("data/japanese/sentences"))
      for (const s of read(`data/japanese/sentences/${f}`).items) sentences.set(s.slug, s.text);
    const taught = new Set<string>();
    let withKanji = 0;
    for (const course of ["n5-core", "n4-core"])
      for (const lesson of read(`data/japanese/curriculum/courses/${course}.json`).lessons) {
        for (const i of lesson.items) if (i.startsWith("kanji:")) taught.add(i.slice(6));
        for (const i of lesson.items.filter((x: string) => x.startsWith("sentence:"))) {
          const text = sentences.get(i.slice(9))!;
          const kanji = text.match(/[一-鿿]/g) ?? [];
          if (kanji.length) withKanji++;
          for (const k of kanji) expect(taught.has(k), `${i}: ${k}`).toBe(true);
          if (kanji.length) expect(text).toMatch(/《/);
        }
      }
    expect(withKanji).toBeGreaterThan(150);
  });
});
