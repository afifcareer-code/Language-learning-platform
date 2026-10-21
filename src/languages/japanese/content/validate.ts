import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { missingLocales, placeholdersIn } from "@/localization/content";
import { LOCALES } from "@/localization/config";
import { japaneseSkills } from "../skills";
import {
  activityTemplateFileSchema,
  courseFileSchema,
  TEMPLATE_PLACEHOLDERS,
  levelsFileSchema,
} from "../curriculum/schema";
import { GRAMMAR_CONTENT_TYPE, grammarFileSchema, grammarItemKey } from "../grammar/schema";
import { KANA_CONTENT_TYPE, KANA_SCRIPTS, kanaFileSchema, kanaItemKey } from "../scripts/kana";
import {
  SENTENCE_CONTENT_TYPE,
  sentenceFileSchema,
  sentenceItemKey,
  tokensMatchText,
} from "../sentences/schema";
import { VOCABULARY_CONTENT_TYPE, vocabularyFileSchema, vocabularyItemKey } from "../vocabulary/schema";

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
  /** Content type of each item key, so templates can be checked against lesson contents. */
  const typeOfKey = new Map<string, string>();
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
      typeOfKey.set(key, KANA_CONTENT_TYPE);
      romaji.add(c.romaji);
    }
  }

  const addKey = (where: string, key: string, type: string) => {
    if (keys.has(key)) problems.push(`${where}: duplicate item ${key}`);
    keys.add(key);
    typeOfKey.set(key, type);
  };
  const folder = async (name: string) => {
    try {
      return (await readdir(join(root, name))).filter((f) => f.endsWith(".json")).sort();
    } catch {
      return [];
    }
  };

  for (const file of await folder("vocabulary")) {
    const parsed = vocabularyFileSchema.safeParse(await readJson(join(root, "vocabulary", file)));
    if (!parsed.success) {
      problems.push(`vocabulary/${file}: ${parsed.error.message}`);
      continue;
    }
    for (const word of parsed.data.items) {
      addKey(`vocabulary/${file}`, vocabularyItemKey(word), VOCABULARY_CONTENT_TYPE);
      checkLocales(`vocabulary/${file} "${word.kana}" meaning`, word.meaning);
    }
  }

  const grammarSlugs = new Set<string>();
  const grammarRelated: [string, string][] = [];
  for (const file of await folder("grammar")) {
    const parsed = grammarFileSchema.safeParse(await readJson(join(root, "grammar", file)));
    if (!parsed.success) {
      problems.push(`grammar/${file}: ${parsed.error.message}`);
      continue;
    }
    for (const g of parsed.data.items) {
      const where = `grammar/${file} "${g.slug}"`;
      addKey(where, grammarItemKey(g.slug), GRAMMAR_CONTENT_TYPE);
      grammarSlugs.add(g.slug);
      checkLocales(`${where} meaning`, g.meaning);
      checkLocales(`${where} explanation`, g.explanation);
      g.examples.forEach((e, i) => checkLocales(`${where} example ${i + 1}`, e.translation));
      (g.commonErrors ?? []).forEach((e, i) => checkLocales(`${where} common error ${i + 1}`, e));
      for (const r of g.related ?? []) grammarRelated.push([where, r]);
    }
  }
  for (const [where, slug] of grammarRelated) {
    if (!grammarSlugs.has(slug)) problems.push(`${where}: unknown related grammar "${slug}"`);
  }

  for (const file of await folder("sentences")) {
    const parsed = sentenceFileSchema.safeParse(await readJson(join(root, "sentences", file)));
    if (!parsed.success) {
      problems.push(`sentences/${file}: ${parsed.error.message}`);
      continue;
    }
    for (const sentence of parsed.data.items) {
      const where = `sentences/${file} "${sentence.slug}"`;
      addKey(where, sentenceItemKey(sentence.slug), SENTENCE_CONTENT_TYPE);
      if (!tokensMatchText(sentence)) problems.push(`${where}: tokens do not spell the text`);
      if (!grammarSlugs.has(sentence.grammar))
        problems.push(`${where}: unknown grammar "${sentence.grammar}"`);
      checkLocales(`${where} translation`, sentence.translation);
    }
  }

  const levels = levelsFileSchema.safeParse(await readJson(join(root, "curriculum", "levels.json")));
  const courseSlugs: string[] = [];
  if (!levels.success) problems.push(`levels.json: ${levels.error.message}`);
  else {
    const levelSlugs = new Set<string>();
    const frameworkLevels = new Set<string>();
    for (const level of levels.data.levels) {
      if (levelSlugs.has(level.slug)) problems.push(`Duplicate level "${level.slug}"`);
      levelSlugs.add(level.slug);
      if (level.frameworkLevel) {
        if (frameworkLevels.has(level.frameworkLevel))
          problems.push(`Duplicate framework level "${level.frameworkLevel}"`);
        frameworkLevels.add(level.frameworkLevel);
      }
      checkLocales(`level "${level.slug}" title`, level.title);
      checkLocales(`level "${level.slug}" description`, level.description);
      for (const course of level.courses) {
        if (courseSlugs.includes(course))
          problems.push(`Course "${course}" is listed in more than one level`);
        courseSlugs.push(course);
      }
    }
  }

  const courseDir = join(root, "curriculum", "courses");
  for (const file of await readdir(courseDir)) {
    if (!courseSlugs.includes(file.replace(/\.json$/, ""))) {
      problems.push(`curriculum/courses/${file} is not listed in any level`);
    }
  }

  const templateFiles = new Set<string>();
  /** Content types each template file is used with (from its courses' lessons). */
  const typesByTemplateFile = new Map<string, Set<string>>();
  const slugs = new Set<string>();
  for (const slug of courseSlugs) {
    const name = `courses/${slug}.json`;
    let raw: unknown;
    try {
      raw = await readJson(join(courseDir, `${slug}.json`));
    } catch {
      problems.push(`${name}: missing`);
      continue;
    }
    const course = courseFileSchema.safeParse(raw);
    if (!course.success) {
      problems.push(`${name}: ${course.error.message}`);
      continue;
    }
    const c = course.data;
    if (c.slug !== slug) problems.push(`${name}: slug "${c.slug}" does not match its file name`);
    checkLocales(`${name} title`, c.title);
    checkLocales(`${name} description`, c.description);
    templateFiles.add(c.activityTemplates);
    const types = typesByTemplateFile.get(c.activityTemplates) ?? new Set<string>();
    typesByTemplateFile.set(c.activityTemplates, types);
    if (c.lessonObjective) {
      checkLocales(`${name} lessonObjective`, c.lessonObjective);
      for (const text of Object.values(c.lessonObjective)) {
        for (const p of placeholdersIn(text)) {
          if (!["characters", "lesson"].includes(p))
            problems.push(`${name} lessonObjective: unknown placeholder {${p}}`);
        }
      }
    }
    for (const lesson of c.lessons) {
      if (slugs.has(lesson.slug)) problems.push(`Duplicate lesson slug "${lesson.slug}"`);
      slugs.add(lesson.slug);
      checkLocales(`lesson "${lesson.slug}" title`, lesson.title);
      if (lesson.situation) checkLocales(`lesson "${lesson.slug}" situation`, lesson.situation);
      if (lesson.objective) checkLocales(`lesson "${lesson.slug}" objective`, lesson.objective);
      if (!lesson.objective && !c.lessonObjective) problems.push(`lesson "${lesson.slug}" has no objective`);
      for (const key of lesson.items) {
        if (!keys.has(key)) problems.push(`Lesson "${lesson.slug}" references unknown item "${key}"`);
        else types.add(typeOfKey.get(key)!);
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
      if (!typesByTemplateFile.get(name)?.has(template.contentType)) {
        problems.push(`${where}: no lesson using this file has "${template.contentType}" items`);
      }
      for (const l of LOCALES) if (!template.text[l]) problems.push(`${where}: missing "${l}" translation`);
      for (const [locale, text] of Object.entries(template.text)) {
        for (const value of Object.values(text)) {
          for (const p of placeholdersIn(value)) {
            if (!(TEMPLATE_PLACEHOLDERS as readonly string[]).includes(p)) {
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
