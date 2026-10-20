/**
 * Validate content files without touching a database.
 * Run with `npm run content:validate`; also exercised by the unit test suite.
 */
import { join } from "node:path";
import { validateJapaneseContent } from "@/languages/japanese/content/validate";
import { validateLanguageCatalog } from "@/languages/validate-catalog";

async function main() {
  const dataDir = join(process.cwd(), "data");
  const problems = [...(await validateLanguageCatalog(dataDir)), ...(await validateJapaneseContent(dataDir))];
  if (problems.length) {
    for (const p of problems) console.error(`✗ ${p}`);
    process.exit(1);
  }
  console.log("✓ Language catalog and Japanese content are valid");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
