import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const files = (dir: string, prefix: string) =>
  readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .map((f) => read(`${dir}/${f}`));

describe("N5 coverage", () => {
  it("teaches the N5 word list, the N5 grammar and every N5 kanji in its lessons", () => {
    const words = files("data/japanese/vocabulary", "n5-").flatMap((f) => f.items);
    const grammar = files("data/japanese/grammar", "n5-").flatMap((f) => f.items);
    expect(words.length).toBeGreaterThanOrEqual(650);
    expect(grammar.length).toBeGreaterThanOrEqual(70);
    const course = read("data/japanese/curriculum/courses/n5-core.json");
    const taught = new Set(course.lessons.flatMap((l: { items: string[] }) => l.items));
    for (const k of read("data/japanese/kanji/n5.json").items)
      expect(taught.has(`kanji:${k.character}`), k.character).toBe(true);
    for (const g of grammar) expect(taught.has(`grammar:${g.slug}`), g.slug).toBe(true);
  });

  it("keeps words that share their kana apart", () => {
    const words = files("data/japanese/vocabulary", "n5-").flatMap((f) => f.items);
    const hot = words.filter((w: { kana: string }) => w.kana === "あつい");
    expect(hot.map((w: { kanji?: string }) => w.kanji).sort()).toEqual(["厚い", "暑い", "熱い"]);
    expect(new Set(hot.map((w: { homonym?: number }) => w.homonym ?? 1)).size).toBe(3);
  });
});
