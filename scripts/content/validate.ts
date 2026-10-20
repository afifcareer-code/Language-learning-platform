/**
 * Validate content files without touching a database.
 * Run with `npm run content:validate`; also exercised by the unit test suite.
 */
import { join } from "node:path";
import { validateJapaneseContent } from "@/languages/japanese/content/validate";

async function main() {
  const problems = await validateJapaneseContent(join(process.cwd(), "data"));
  if (problems.length) {
    for (const p of problems) console.error(`✗ ${p}`);
    process.exit(1);
  }
  console.log("✓ Japanese content is valid");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
