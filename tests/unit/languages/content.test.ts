import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateJapaneseContent } from "@/languages/japanese/content/validate";

describe("Japanese content files", () => {
  it("are valid and internally consistent", async () => {
    expect(await validateJapaneseContent(join(process.cwd(), "data"))).toEqual([]);
  });
});

describe("content validation catches broken content", () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /** Copy data/ to a temporary folder and change one JSON file. */
  async function validateWith(file: string, change: (json: Record<string, unknown>) => void) {
    dir = mkdtempSync(join(tmpdir(), "llp-content-"));
    cpSync(join(process.cwd(), "data"), dir, { recursive: true });
    const path = join(dir, "japanese", file);
    const json = JSON.parse(readFileSync(path, "utf8"));
    change(json);
    writeFileSync(path, JSON.stringify(json));
    return validateJapaneseContent(dir);
  }

  it("sentence pieces that do not spell the sentence", async () => {
    const problems = await validateWith("sentences/n5-introductions.json", (json) => {
      const [first] = json.items as { tokens: string[] }[];
      first!.tokens = [...first!.tokens].reverse().slice(1);
    });
    expect(problems.some((p) => p.includes("tokens do not spell the text"))).toBe(true);
  });

  it("a missing translation of a word's meaning", async () => {
    const problems = await validateWith("vocabulary/n5-introductions.json", (json) => {
      delete (json.items as { meaning: Record<string, string> }[])[0]!.meaning.id;
    });
    expect(problems.some((p) => p.includes('missing "id" translation'))).toBe(true);
  });

  it("a lesson without an objective", async () => {
    const problems = await validateWith("curriculum/courses/n5-core.json", (json) => {
      delete (json.lessons as { objective?: unknown }[])[0]!.objective;
    });
    expect(problems).toContain('lesson "n5-01-introductions" has no objective');
  });

  it("a lesson that references an unknown item", async () => {
    const problems = await validateWith("curriculum/courses/n5-core.json", (json) => {
      (json.lessons as { items: string[] }[])[0]!.items.push("vocabulary:ないことば");
    });
    expect(problems.some((p) => p.includes("unknown item"))).toBe(true);
  });
});
