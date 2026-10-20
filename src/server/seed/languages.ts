import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { languageCatalogSchema } from "@/languages/catalog";
import { listLanguageModules } from "@/languages/registry";
import type { Database } from "../db/client";
import { upsert } from "../db/dialect";

/**
 * Load the language catalog (data/languages.json). A language is stored as
 * available only if its module is installed, whatever the file says.
 */
export async function seedLanguageCatalog(db: Database, dataDir: string): Promise<{ languages: number }> {
  const catalog = languageCatalogSchema.parse(
    JSON.parse(await readFile(join(dataDir, "languages.json"), "utf8")),
  );
  const installed = new Set(listLanguageModules().map((m) => m.code));
  const t = db.t.languages;
  await db.transaction(async (tx) => {
    for (const [sortOrder, l] of catalog.languages.entries()) {
      const row = {
        name: l.name,
        nativeName: l.nativeName,
        status: l.status === "available" && installed.has(l.code) ? "available" : "coming_soon",
        writingSystem: l.writingSystem,
        proficiencyFramework: l.proficiencyFramework,
        sortOrder,
      };
      await upsert(db, tx, t, { code: l.code, ...row }, { target: [t.code], set: row });
    }
  });
  return { languages: catalog.languages.length };
}
