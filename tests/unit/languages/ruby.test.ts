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
