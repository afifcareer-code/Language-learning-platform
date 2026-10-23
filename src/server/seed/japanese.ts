import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, notInArray } from "drizzle-orm";
import { japanese } from "@/languages/japanese";
import { expandLessonActivities, type LessonItems } from "@/languages/japanese/curriculum/activities";
import {
  activityTemplateFileSchema,
  courseFileSchema,
  levelsFileSchema,
  type ActivityTemplateFile,
} from "@/languages/japanese/curriculum/schema";
import {
  GRAMMAR_CONTENT_TYPE,
  grammarFileSchema,
  grammarItemId,
  grammarItemKey,
  type GrammarItemData,
  type GrammarTranslation,
} from "@/languages/japanese/grammar/schema";
import {
  KANA_CONTENT_TYPE,
  KANA_SCRIPTS,
  kanaFileSchema,
  kanaItemId,
  kanaItemKey,
  type KanaItemData,
  type KanaScript,
} from "@/languages/japanese/scripts/kana";
import {
  SENTENCE_CONTENT_TYPE,
  sentenceFileSchema,
  sentenceItemId,
  sentenceItemKey,
  type SentenceItemData,
  type SentenceTranslation,
} from "@/languages/japanese/sentences/schema";
import {
  PASSAGE_CONTENT_TYPE,
  passageFileSchema,
  passageItemId,
  passageItemKey,
  type PassageItemData,
  type PassageTranslation,
} from "@/languages/japanese/passages/schema";
import {
  NATIVE_CONTENT_TYPE,
  nativeFileSchema,
  nativeItemId,
  nativeItemKey,
  type NativeItemData,
  type NativeTranslation,
} from "@/languages/japanese/native/schema";
import {
  SITUATION_CONTENT_TYPE,
  situationFileSchema,
  situationItemId,
  situationItemKey,
  type SituationItemData,
  type SituationTranslation,
} from "@/languages/japanese/situations/schema";
import {
  VOCABULARY_CONTENT_TYPE,
  vocabularyDisplay,
  vocabularyFileSchema,
  vocabularyItemId,
  vocabularyItemKey,
  type VocabularyItemData,
  type VocabularyTranslation,
} from "@/languages/japanese/vocabulary/schema";
import { fillPlaceholders } from "@/localization/content";
import type { Database, Transaction } from "../db/client";
import { upsert } from "../db/dialect";

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

/** Every JSON file in a content folder (a missing folder is empty). */
async function readFolder<T>(dir: string, parse: (raw: unknown) => T): Promise<T[]> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return Promise.all(files.map(async (f) => parse(await readJson(join(dir, f)))));
}

/** Localized script names from the module's own messages, e.g. { en: "Hiragana", id: "Hiragana" }. */
function scriptNames(script: KanaScript): Record<string, string> {
  return Object.fromEntries(
    Object.entries(japanese.messages).map(([locale, m]) => [
      locale,
      (m as { scripts: Record<KanaScript, string> }).scripts[script],
    ]),
  );
}

/** Turn { title: {en, id}, description: {en, id} } into { en: {title, description}, id: {…} }. */
function byLocale(fields: Record<string, Record<string, string> | undefined>) {
  const out: Record<string, Record<string, string | null>> = {};
  for (const [field, text] of Object.entries(fields)) {
    for (const [locale, value] of Object.entries(text ?? {})) (out[locale] ??= {})[field] = value;
  }
  return out;
}

/** One content item to store: data in the learning language plus per-locale translations. */
interface SeedItem {
  id: string;
  key: string;
  type: string;
  data: unknown;
  tags: string[];
  level: string;
  /** How the item reads in a list, e.g. "あ" or "がくせい". */
  display: string;
  translations: Record<string, unknown>;
}

/** Read and validate every Japanese content item: characters, vocabulary, grammar points, sentences. */
async function readItems(root: string): Promise<SeedItem[]> {
  const items: SeedItem[] = [];
  for (const script of KANA_SCRIPTS) {
    const file = kanaFileSchema.parse(await readJson(join(root, "characters", `${script}.json`)));
    for (const char of file.characters) {
      items.push({
        id: kanaItemId(script, char.romaji),
        key: kanaItemKey(script, char.kana),
        type: KANA_CONTENT_TYPE,
        data: { script, ...char } satisfies KanaItemData,
        tags: [script, `row:${char.row}`],
        level: "foundation",
        display: char.kana,
        translations: {},
      });
    }
  }
  for (const file of await readFolder(join(root, "vocabulary"), (raw) => vocabularyFileSchema.parse(raw))) {
    for (const { meaning, ...word } of file.items) {
      items.push({
        id: vocabularyItemId(word),
        key: vocabularyItemKey(word),
        type: VOCABULARY_CONTENT_TYPE,
        data: word satisfies VocabularyItemData,
        tags: [word.partOfSpeech],
        level: file.level,
        display: vocabularyDisplay(word),
        translations: Object.fromEntries(
          Object.entries(meaning).map(([locale, m]) => [
            locale,
            { meaning: m } satisfies VocabularyTranslation,
          ]),
        ),
      });
    }
  }
  for (const file of await readFolder(join(root, "grammar"), (raw) => grammarFileSchema.parse(raw))) {
    for (const g of file.items) {
      items.push({
        id: grammarItemId(g.slug),
        key: grammarItemKey(g.slug),
        type: GRAMMAR_CONTENT_TYPE,
        data: {
          slug: g.slug,
          pattern: g.pattern,
          examples: g.examples.map(({ ja, romaji }) => ({ ja, romaji })),
          related: g.related ?? [],
        } satisfies GrammarItemData,
        tags: [],
        level: file.level,
        display: g.pattern,
        translations: Object.fromEntries(
          Object.keys(g.meaning).map((locale) => [
            locale,
            {
              meaning: g.meaning[locale] ?? g.meaning.en!,
              explanation: g.explanation[locale] ?? g.explanation.en!,
              examples: g.examples.map((e) => e.translation[locale] ?? e.translation.en!),
              commonErrors: (g.commonErrors ?? []).map((e) => e[locale] ?? e.en!),
            } satisfies GrammarTranslation,
          ]),
        ),
      });
    }
  }
  for (const file of await readFolder(join(root, "sentences"), (raw) => sentenceFileSchema.parse(raw))) {
    for (const { translation, ...sentence } of file.items) {
      items.push({
        id: sentenceItemId(sentence.slug),
        key: sentenceItemKey(sentence.slug),
        type: SENTENCE_CONTENT_TYPE,
        data: sentence satisfies SentenceItemData,
        tags: [`grammar:${sentence.grammar}`],
        level: file.level,
        display: sentence.text,
        translations: Object.fromEntries(
          Object.entries(translation).map(([l, text]) => [
            l,
            { translation: text } satisfies SentenceTranslation,
          ]),
        ),
      });
    }
  }
  for (const file of await readFolder(join(root, "situations"), (raw) => situationFileSchema.parse(raw))) {
    for (const { prompt, ...situation } of file.items) {
      items.push({
        id: situationItemId(situation.slug),
        key: situationItemKey(situation.slug),
        type: SITUATION_CONTENT_TYPE,
        data: situation satisfies SituationItemData,
        tags: [`situation:${situation.kind}`],
        level: file.level,
        display: situation.model,
        translations: Object.fromEntries(
          Object.entries(prompt).map(([l, text]) => [l, { prompt: text } satisfies SituationTranslation]),
        ),
      });
    }
  }
  for (const file of await readFolder(join(root, "passages"), (raw) => passageFileSchema.parse(raw))) {
    for (const { comprehension, ...passage } of file.items) {
      items.push({
        id: passageItemId(passage.slug),
        key: passageItemKey(passage.slug),
        type: PASSAGE_CONTENT_TYPE,
        data: passage satisfies PassageItemData,
        tags: [`passage:${passage.form}`],
        level: file.level,
        display: passage.lines.map((l) => l.text).join(" "),
        translations: Object.fromEntries(
          Object.entries(comprehension).map(([l, c]) => [l, c satisfies PassageTranslation]),
        ),
      });
    }
  }
  for (const file of await readFolder(join(root, "native"), (raw) => nativeFileSchema.parse(raw))) {
    for (const { translation, ...sentence } of file.items) {
      items.push({
        id: nativeItemId(sentence.slug),
        key: nativeItemKey(sentence.slug),
        type: NATIVE_CONTENT_TYPE,
        data: sentence satisfies NativeItemData,
        tags: ["native"],
        level: file.level,
        display: sentence.text,
        translations: Object.fromEntries(
          Object.entries(translation).map(([l, text]) => [
            l,
            { translation: text } satisfies NativeTranslation,
          ]),
        ),
      });
    }
  }
  return items;
}

/**
 * Idempotently load Japanese content from data/japanese: characters,
 * vocabulary, grammar points, sentences, levels, courses, lessons and their
 * activities, with every translation.
 */
export async function seedJapanese(
  db: Database,
  dataDir: string,
): Promise<{ items: number; lessons: number; activities: number }> {
  const root = join(dataDir, "japanese");
  const t = db.t;

  // Read and validate everything before touching the database.
  const items = await readItems(root);
  const levels = levelsFileSchema.parse(await readJson(join(root, "curriculum", "levels.json")));
  // Courses in curriculum order: by level, then as each level lists them.
  const courseFiles = await Promise.all(
    levels.levels.flatMap((level) =>
      level.courses.map(async (slug) => ({
        level: level.slug,
        ...courseFileSchema.parse(await readJson(join(root, "curriculum", "courses", `${slug}.json`))),
      })),
    ),
  );
  const templates = new Map<string, ActivityTemplateFile>();
  for (const course of courseFiles) {
    if (!templates.has(course.activityTemplates)) {
      const path = join(root, "activities", `${course.activityTemplates}.json`);
      templates.set(course.activityTemplates, activityTemplateFileSchema.parse(await readJson(path)));
    }
  }

  const byKey = new Map(items.map((i) => [i.key, i]));
  let lessonCount = 0;
  let activityCount = 0;

  const translate = async <
    T extends typeof t.levelTranslations | typeof t.courseTranslations | typeof t.lessonTranslations,
  >(
    tx: Transaction,
    table: T,
    key: Record<string, string>,
    keyColumn: T["_"]["columns"][keyof T["_"]["columns"]],
    texts: Record<string, Record<string, string | null>>,
  ) => {
    for (const [locale, fields] of Object.entries(texts)) {
      await upsert(db, tx, table, { ...key, locale, ...fields } as never, {
        target: [keyColumn as never, table.locale],
        set: fields as never,
      });
    }
  };

  // One transaction, so a running app never sees a half-seeded curriculum.
  // The language row itself comes from the platform catalog (seedLanguageCatalog).
  await db.transaction(async (tx) => {
    const levelIdBySlug = new Map<string, string>();
    for (const [sortOrder, level] of levels.levels.entries()) {
      const id = `ja.level.${level.slug}`;
      const row = {
        languageCode: japanese.code,
        slug: level.slug,
        frameworkLevel: level.frameworkLevel,
        sortOrder,
      };
      await upsert(db, tx, t.levels, { id, ...row }, { target: [t.levels.id], set: row });
      await translate(
        tx,
        t.levelTranslations,
        { levelId: id },
        t.levelTranslations.levelId,
        byLocale({ title: level.title, description: level.description }),
      );
      levelIdBySlug.set(level.slug, id);
    }

    const orderInType = new Map<string, number>();
    for (const item of items) {
      const levelId = levelIdBySlug.get(item.level);
      if (!levelId) throw new Error(`Item "${item.key}" references unknown level "${item.level}"`);
      const sortOrder = orderInType.get(item.type) ?? 0;
      orderInType.set(item.type, sortOrder + 1);
      const row = {
        languageCode: japanese.code,
        type: item.type,
        key: item.key,
        data: item.data,
        tags: item.tags,
        sortOrder,
        levelId,
      };
      await upsert(
        db,
        tx,
        t.contentItems,
        { id: item.id, ...row },
        { target: [t.contentItems.id], set: row },
      );
      for (const [locale, data] of Object.entries(item.translations)) {
        await upsert(
          db,
          tx,
          t.contentItemTranslations,
          { contentItemId: item.id, locale, data },
          {
            target: [t.contentItemTranslations.contentItemId, t.contentItemTranslations.locale],
            set: { data },
          },
        );
      }
    }

    for (const [courseIndex, course] of courseFiles.entries()) {
      const courseId = `ja.course.${course.slug}`;
      const levelId = levelIdBySlug.get(course.level);
      if (!levelId) throw new Error(`Course "${course.slug}" references unknown level "${course.level}"`);
      const courseRow = { languageCode: japanese.code, levelId, slug: course.slug, sortOrder: courseIndex };
      await upsert(
        db,
        tx,
        t.courses,
        { id: courseId, ...courseRow },
        { target: [t.courses.id], set: courseRow },
      );
      await translate(
        tx,
        t.courseTranslations,
        { courseId },
        t.courseTranslations.courseId,
        byLocale({ title: course.title, description: course.description }),
      );

      for (const [lessonIndex, lesson] of course.lessons.entries()) {
        const lessonId = `ja.lesson.${lesson.slug}`;
        const lessonItems = lesson.items.map((key) => {
          const item = byKey.get(key);
          if (!item) throw new Error(`Lesson "${lesson.slug}" references unknown item "${key}"`);
          return item;
        });
        const itemsByType: Record<string, LessonItems> = {};
        for (const item of lessonItems) {
          const group = (itemsByType[item.type] ??= { ids: [], characters: "" });
          group.ids.push(item.id);
          group.characters = group.characters ? `${group.characters} ${item.display}` : item.display;
        }
        const kanaData = lessonItems.find((i) => i.type === KANA_CONTENT_TYPE)?.data as
          KanaItemData | undefined;

        // The lesson's own objective, or the course's objective template.
        const objective =
          lesson.objective ??
          (course.lessonObjective
            ? Object.fromEntries(
                Object.entries(course.lessonObjective).map(([locale, text]) => [
                  locale,
                  fillPlaceholders(text, {
                    characters: itemsByType[KANA_CONTENT_TYPE]?.characters ?? "",
                    lesson: lesson.title[locale] ?? lesson.title.en ?? "",
                  }),
                ]),
              )
            : undefined);

        const lessonRow = { courseId, slug: lesson.slug, sortOrder: lessonIndex };
        await upsert(
          db,
          tx,
          t.lessons,
          { id: lessonId, ...lessonRow },
          { target: [t.lessons.id], set: lessonRow },
        );
        await translate(
          tx,
          t.lessonTranslations,
          { lessonId },
          t.lessonTranslations.lessonId,
          byLocale({ title: lesson.title, description: lesson.situation, objective }),
        );

        await tx.delete(t.lessonItems).where(eq(t.lessonItems.lessonId, lessonId));
        await tx
          .insert(t.lessonItems)
          .values(lessonItems.map((item, sortOrder) => ({ lessonId, contentItemId: item.id, sortOrder })));

        const activities = expandLessonActivities(
          { ...lesson, id: lessonId },
          templates.get(course.activityTemplates)!,
          { itemsByType, scriptName: kanaData ? scriptNames(kanaData.script) : undefined },
        );
        for (const { definition: a, text } of activities) {
          const row = {
            languageCode: a.languageCode,
            lessonId: a.lessonId,
            type: a.type,
            skill: a.skill,
            difficulty: a.difficulty,
            evaluation: a.evaluation,
            successCriteria: [...a.successCriteria],
            passScore: a.passScore,
            targetMastery: a.targetMastery,
            sortOrder: a.sortOrder,
          };
          await upsert(db, tx, t.activities, { id: a.id, ...row }, { target: [t.activities.id], set: row });
          await tx.delete(t.activityItems).where(eq(t.activityItems.activityId, a.id));
          await tx.insert(t.activityItems).values(
            a.contentItemIds.map((contentItemId, sortOrder) => ({
              activityId: a.id,
              contentItemId,
              sortOrder,
            })),
          );
          for (const [locale, fields] of Object.entries(text)) {
            await upsert(
              db,
              tx,
              t.activityTranslations,
              { activityId: a.id, locale, ...fields },
              {
                target: [t.activityTranslations.activityId, t.activityTranslations.locale],
                set: fields,
              },
            );
          }
          activityCount++;
        }
        lessonCount++;
      }
    }

    // Remove courses no longer in the data (e.g. after a course was split).
    // Their lessons were moved to the new courses above, so nothing cascades.
    const courseIds = courseFiles.map((c) => `ja.course.${c.slug}`);
    await tx
      .delete(t.courses)
      .where(and(eq(t.courses.languageCode, japanese.code), notInArray(t.courses.id, courseIds)));
  });

  return { items: items.length, lessons: lessonCount, activities: activityCount };
}
