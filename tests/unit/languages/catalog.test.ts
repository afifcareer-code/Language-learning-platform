import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateLanguageCatalog } from "@/languages/validate-catalog";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

function catalog(languages: object[]): string {
  const dir = mkdtempSync(join(tmpdir(), "llp-catalog-"));
  dirs.push(dir);
  writeFileSync(join(dir, "languages.json"), JSON.stringify({ source: "test", languages }));
  return dir;
}

const ja = {
  code: "ja",
  name: "Japanese",
  nativeName: "日本語",
  status: "available",
  writingSystem: "kana_kanji",
  proficiencyFramework: "jlpt",
};
const en = {
  code: "en",
  name: "English",
  nativeName: "English",
  status: "coming_soon",
  writingSystem: "latin",
  proficiencyFramework: "cefr",
};

describe("language catalog", () => {
  it("is valid as shipped", async () => {
    expect(await validateLanguageCatalog(join(process.cwd(), "data"))).toEqual([]);
  });

  it("only marks a language available when its module is installed", async () => {
    expect(await validateLanguageCatalog(catalog([ja, { ...en, status: "available" }]))).toEqual([
      'languages.json: "en" is marked available but has no language module',
    ]);
  });

  it("requires every installed module to be in the catalog, once", async () => {
    expect(await validateLanguageCatalog(catalog([en]))).toContain(
      'languages.json: installed module "ja" is missing from the catalog',
    );
    expect(await validateLanguageCatalog(catalog([ja, ja]))).toContain(
      'languages.json: duplicate language "ja"',
    );
  });
});
