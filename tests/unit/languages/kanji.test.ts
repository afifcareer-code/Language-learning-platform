import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kanjiFileSchema, kanjiItemId, kanjiReadings } from "@/languages/japanese/kanji/schema";

const load = (level: string) =>
  kanjiFileSchema.parse(JSON.parse(readFileSync(`data/japanese/kanji/${level}.json`, "utf8")));

describe("kanji data", () => {
  it("has the N5 and N4 kanji, each once, with a stroke path for every stroke", () => {
    const n5 = load("n5").items;
    const n4 = load("n4").items;
    expect(n5).toHaveLength(79);
    expect(n4).toHaveLength(166);
    const all = [...n5, ...n4];
    expect(new Set(all.map((k) => k.character)).size).toBe(all.length);
    for (const k of all) expect(k.strokes, k.character).toHaveLength(k.strokeCount);
  });

  it("keeps well-known facts right", () => {
    const n5 = load("n5").items;
    const water = n5.find((k) => k.character === "水")!;
    expect(water.strokeCount).toBe(4);
    expect(water.meanings).toMatchObject({ en: "water", id: "air" });
    expect(n5.find((k) => k.character === "日")!.onyomi).toContain("ニチ");
    expect(kanjiReadings({ onyomi: ["スイ"], kunyomi: ["みず"] })).toBe("スイ / みず");
    expect(kanjiItemId("日")).toBe("ja.kanji.u65e5");
  });
});
