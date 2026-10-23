import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const manifest: Record<string, string> = read("public/audio/ja/manifest.json");

describe("shipped Japanese audio clips", () => {
  it("has a clip for every text the app speaks", () => {
    const texts = [
      ...["hiragana", "katakana"].flatMap((n) =>
        read(`data/japanese/characters/${n}.json`).characters.map((c: { kana: string }) => c.kana),
      ),
      ...readdirSync("data/japanese/vocabulary").flatMap((f) =>
        read(`data/japanese/vocabulary/${f}`).items.map((v: { kana: string }) => v.kana),
      ),
      ...readdirSync("data/japanese/sentences").flatMap((f) =>
        read(`data/japanese/sentences/${f}`).items.map((s: { text: string }) => s.text),
      ),
    ];
    expect(texts.filter((t) => !manifest[t])).toEqual([]);
  });

  it("points only at files that exist", () => {
    for (const file of Object.values(manifest))
      expect(existsSync(`public/audio/ja/${file}`), file).toBe(true);
  });

  it("ships the attribution the voice licence requires", () => {
    const credits = readFileSync("public/audio/CREDITS.md", "utf8");
    expect(credits).toContain("Creative Commons Attribution 3.0");
    expect(credits).toContain("Nagoya Institute of Technology");
  });
});
