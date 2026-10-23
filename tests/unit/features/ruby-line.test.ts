import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RubyLine } from "@/features/practice/comprehension-exercise";

describe("furigana rendering", () => {
  it("puts the reading above the kanji and leaves other text plain", () => {
    const html = renderToStaticMarkup(
      createElement(RubyLine, {
        segments: [{ text: "これは、" }, { text: "私", reading: "わたし" }, { text: "が" }],
      }),
    );
    expect(html).toContain("<ruby>私<rp>(</rp><rt>わたし</rt><rp>)</rp></ruby>");
    expect(html).toContain("<span>これは、</span>");
  });
});
