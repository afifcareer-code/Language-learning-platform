import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { missingLocales, placeholdersIn } from "@/localization/content";
import { LOCALES } from "@/localization/config";
import { japaneseSkills } from "../skills";
import {
  activityTemplateFileSchema,
  courseFileSchema,
  KANA_TEMPLATE_PLACEHOLDERS,
  levelsFileSchema,
} from "../curriculum/schema";
import { KANA_SCRIPTS, kanaFileSchema, kanaItemKey } from "../scripts/kana";

const COURSE_FILES = ["kana-foundations.json"];

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

/**
 * Validate every Japanese content file: structure, references between files,
 * and that every text is translated into every platform locale.
 * Returns human-readable problems; empty when content is valid.
 */
export async function validateJapaneseContent(dataDir: string): Promise<string[]> {
  const root = join(dataDir, "japanese");
  const problems: string[] = [];
  const keys = new Set<string>();
  const skills = new Set(japaneseSkills.map((s) => s.id));

  const checkLocales = (where: string, text: Record<string, unknown>) => {
    for (const l of missingLocales(text)) problems.push(`${where}: missing "${l}" translation`);
  };

  for (const script of KANA_SCRIPTS) {
    const parsed = kanaFileSchema.safeParse(await readJson(join(root, "characters", `${script}.json`)));
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

  const levels = levelsFileSchema.safeParse(await readJson(join(root, "curriculum", "levels.json")));
  const levelSlugs = new Set<string>();
  if (!levels.success) problems.push(`levels.json: ${levels.error.message}`);
  else
    for (const level of levels.data.levels) {
      levelSlugs.add(level.slug);
      checkLocales(`level "${level.slug}" title`, level.title);
      checkLocales(`level "${level.slug}" description`, level.description);
    }

  const templateFiles = new Set<string>();
  const slugs = new Set<string>();
  for (const name of COURSE_FILES) {
    const course = courseFileSchema.safeParse(await readJson(join(root, "curriculum", name)));
    if (!course.success) {
      problems.push(`${name}: ${course.error.message}`);
      continue;
    }
    const c = course.data;
    if (!levelSlugs.has(c.level)) problems.push(`${name}: unknown level "${c.level}"`);
    checkLocales(`${name} title`, c.title);
    checkLocales(`${name} description`, c.description);
    templateFiles.add(c.activityTemplates);
    for (const lesson of c.lessons) {
      if (slugs.has(lesson.slug)) problems.push(`Duplicate lesson slug "${lesson.slug}"`);
      slugs.add(lesson.slug);
      checkLocales(`lesson "${lesson.slug}" title`, lesson.title);
      for (const key of lesson.items) {
        if (!keys.has(key)) problems.push(`Lesson "${lesson.slug}" references unknown item "${key}"`);
      }
    }
  }

  for (const name of templateFiles) {
    const file = activityTemplateFileSchema.safeParse(
      await readJson(join(root, "activities", `${name}.json`)),
    );
    if (!file.success) {
      problems.push(`activities/${name}.json: ${file.error.message}`);
      continue;
    }
    for (const template of file.data.templates) {
      const where = `activities/${name}.json "${template.key}"`;
      if (!skills.has(template.skill)) problems.push(`${where}: unknown skill "${template.skill}"`);
      for (const l of LOCALES) if (!template.text[l]) problems.push(`${where}: missing "${l}" translation`);
      for (const [locale, text] of Object.entries(template.text)) {
        for (const value of Object.values(text)) {
          for (const p of placeholdersIn(value)) {
            if (!(KANA_TEMPLATE_PLACEHOLDERS as readonly string[]).includes(p)) {
              problems.push(`${where} (${locale}): unknown placeholder {${p}}`);
            }
          }
        }
      }
    }
  }

  const confusion = (await readJson(join(root, "confusion", "kana.json"))) as { pairs?: unknown };
  if (!Array.isArray(confusion.pairs)) problems.push("confusion/kana.json: missing pairs");
  else
    for (const pair of confusion.pairs as unknown[]) {
      if (
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        pair.some((k) => typeof k !== "string" || !keys.has(k))
      ) {
        problems.push(`confusion/kana.json: invalid pair ${JSON.stringify(pair)}`);
      }
    }

  return problems;
}
