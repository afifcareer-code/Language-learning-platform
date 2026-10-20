import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { courseFileSchema } from "../curriculum/schema";
import { KANA_SCRIPTS, kanaFileSchema, kanaItemKey } from "../scripts/kana";

/** Returns a list of human-readable problems; empty when content is valid. */
export async function validateJapaneseContent(dataDir: string): Promise<string[]> {
  const root = join(dataDir, "japanese");
  const problems: string[] = [];
  const keys = new Set<string>();

  for (const script of KANA_SCRIPTS) {
    const parsed = kanaFileSchema.safeParse(
      JSON.parse(await readFile(join(root, "characters", `${script}.json`), "utf8")),
    );
    if (!parsed.success) {
      problems.push(`${script}.json: ${parsed.error.message}`);
      continue;
    }
    if (parsed.data.script !== script)
      problems.push(`${script}.json declares script "${parsed.data.script}"`);
    const romaji = new Set<string>();
    for (const c of parsed.data.characters) {
      const key = kanaItemKey(script, c.kana);
      if (keys.has(key)) problems.push(`Duplicate kana ${key}`);
      if (romaji.has(c.romaji)) problems.push(`Duplicate romaji "${c.romaji}" in ${script}`);
      keys.add(key);
      romaji.add(c.romaji);
    }
  }

  const course = courseFileSchema.safeParse(
    JSON.parse(await readFile(join(root, "curriculum", "kana-foundations.json"), "utf8")),
  );
  if (!course.success) {
    problems.push(`kana-foundations.json: ${course.error.message}`);
  } else {
    const slugs = new Set<string>();
    for (const lesson of course.data.lessons) {
      if (slugs.has(lesson.slug)) problems.push(`Duplicate lesson slug "${lesson.slug}"`);
      slugs.add(lesson.slug);
      for (const key of lesson.items) {
        if (!keys.has(key)) problems.push(`Lesson "${lesson.slug}" references unknown item "${key}"`);
      }
    }
  }

  return problems;
}
