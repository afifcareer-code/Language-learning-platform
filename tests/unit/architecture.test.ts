import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const core = files(join(process.cwd(), "src/core"));

describe("core learning engine boundaries", () => {
  it.each(core)("%s imports nothing language-, persistence- or UI-specific", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(/from ["']@\/(languages|server|app|components|features)/);
    expect(source).not.toMatch(/from ["'](react|next)/);
  });

  it.each(core)("%s contains no Japanese-specific concepts", (file) => {
    const source = readFileSync(file, "utf8").toLowerCase();
    for (const term of ["hiragana", "katakana", "kanji", "kana", "jlpt", "romaji"]) {
      expect(source).not.toContain(term);
    }
  });
});
