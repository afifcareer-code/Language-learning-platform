import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { languageCatalogSchema } from "./catalog";
import { listLanguageModules } from "./registry";

/** Check data/languages.json against the installed language modules. */
export async function validateLanguageCatalog(dataDir: string): Promise<string[]> {
  const parsed = languageCatalogSchema.safeParse(
    JSON.parse(await readFile(join(dataDir, "languages.json"), "utf8")),
  );
  if (!parsed.success) return [`languages.json: ${parsed.error.message}`];

  const problems: string[] = [];
  const codes = new Set<string>();
  const installed = new Set(listLanguageModules().map((m) => m.code));
  for (const l of parsed.data.languages) {
    if (codes.has(l.code)) problems.push(`languages.json: duplicate language "${l.code}"`);
    codes.add(l.code);
    if (l.status === "available" && !installed.has(l.code)) {
      problems.push(`languages.json: "${l.code}" is marked available but has no language module`);
    }
  }
  for (const code of installed) {
    if (!codes.has(code))
      problems.push(`languages.json: installed module "${code}" is missing from the catalog`);
  }
  return problems;
}
