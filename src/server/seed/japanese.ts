import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, notInArray } from "drizzle-orm";
import { japanese } from "@/languages/japanese";
import { expandLessonActivities } from "@/languages/japanese/curriculum/activities";
import {
  activityTemplateFileSchema,
  courseFileSchema,
  levelsFileSchema,
  type ActivityTemplateFile,
} from "@/languages/japanese/curriculum/schema";
import {
  KANA_CONTENT_TYPE,
  KANA_SCRIPTS,
  kanaFileSchema,
  kanaItemId,
  kanaItemKey,
  type KanaItemData,
  type KanaScript,
} from "@/languages/japanese/scripts/kana";
import type { Database, Transaction } from "../db/client";
import { upsert } from "../db/dialect";

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
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

/**
 * Idempotently load Japanese content from data/japanese: characters, levels,
 * courses, lessons and their activities, with every translation.
 */
export async function seedJapanese(
  db: Database,
  dataDir: string,
): Promise<{ items: number; lessons: number; activities: number }> {
  const root = join(dataDir, "japanese");
  const t = db.t;

  // Validate everything before touching the database.
  const scripts = await Promise.all(
    KANA_SCRIPTS.map(async (script) => ({
      script,
      file: kanaFileSchema.parse(await readJson(join(root, "characters", `${script}.json`))),
    })),
  );
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

  const idByKey = new Map<string, string>();
  const kanaById = new Map<string, KanaItemData>();
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

  /** Turn { title: {en, id}, description: {en, id} } into { en: {title, description}, id: {…} }. */
  const byLocale = (fields: Record<string, Record<string, string> | undefined>) => {
    const out: Record<string, Record<string, string | null>> = {};
    for (const [field, text] of Object.entries(fields)) {
      for (const [locale, value] of Object.entries(text ?? {})) (out[locale] ??= {})[field] = value;
    }
    return out;
  };

  // One transaction, so a running app never sees a half-seeded curriculum.
  // The language row itself comes from the platform catalog (seedLanguageCatalog).
  await db.transaction(async (tx) => {
    for (const { script, file } of scripts) {
      for (const [i, char] of file.characters.entries()) {
        const id = kanaItemId(script, char.romaji);
        const key = kanaItemKey(script, char.kana);
        const data: KanaItemData = { script, ...char };
        const row = {
          languageCode: japanese.code,
          type: KANA_CONTENT_TYPE,
          key,
          data,
          tags: [script, `row:${char.row}`],
          sortOrder: i,
        };
        await upsert(db, tx, t.contentItems, { id, ...row }, { target: [t.contentItems.id], set: row });
        idByKey.set(key, id);
        kanaById.set(id, data);
      }
    }

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
          byLocale({ title: lesson.title }),
        );

        const itemIds = lesson.items.map((key) => {
          const id = idByKey.get(key);
          if (!id) throw new Error(`Lesson "${lesson.slug}" references unknown item "${key}"`);
          return id;
        });
        await tx.delete(t.lessonItems).where(eq(t.lessonItems.lessonId, lessonId));
        await tx
          .insert(t.lessonItems)
          .values(itemIds.map((contentItemId, sortOrder) => ({ lessonId, contentItemId, sortOrder })));

        const firstKana = kanaById.get(itemIds[0]!)!;
        const activities = expandLessonActivities(
          { ...lesson, id: lessonId },
          templates.get(course.activityTemplates)!,
          {
            contentItemIds: itemIds,
            characters: itemIds.map((id) => kanaById.get(id)!.kana).join(" "),
            scriptName: scriptNames(firstKana.script),
          },
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

  return { items: idByKey.size, lessons: lessonCount, activities: activityCount };
}
