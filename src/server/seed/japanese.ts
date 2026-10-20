import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { upsert } from "../db/dialect";
import { japanese } from "@/languages/japanese";
import {
  KANA_CONTENT_TYPE,
  KANA_SCRIPTS,
  kanaFileSchema,
  kanaItemId,
  kanaItemKey,
  type KanaItemData,
} from "@/languages/japanese/scripts/kana";
import { courseFileSchema } from "@/languages/japanese/curriculum/schema";

const COURSE_FILES = ["kana-foundations.json"];

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

/** Idempotently load Japanese content from data/japanese into the database. */
export async function seedJapanese(
  db: Database,
  dataDir: string,
): Promise<{ items: number; lessons: number }> {
  const root = join(dataDir, "japanese");
  const { contentItems, courses, languages, lessonItems, lessons } = db.t;

  // Validate everything before touching the database.
  const scripts = await Promise.all(
    KANA_SCRIPTS.map(async (script) => ({
      script,
      file: kanaFileSchema.parse(await readJson(join(root, "characters", `${script}.json`))),
    })),
  );
  const courseFiles = await Promise.all(
    COURSE_FILES.map(async (name) => courseFileSchema.parse(await readJson(join(root, "curriculum", name)))),
  );

  const idByKey = new Map<string, string>();
  let lessonCount = 0;

  // One transaction, so a running app never sees a half-seeded curriculum.
  await db.transaction(async (tx) => {
    await upsert(
      db,
      tx,
      languages,
      { code: japanese.code, name: japanese.name, nativeName: japanese.nativeName },
      { target: [languages.code], set: { name: japanese.name, nativeName: japanese.nativeName } },
    );

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
        await upsert(db, tx, contentItems, { id, ...row }, { target: [contentItems.id], set: row });
        idByKey.set(key, id);
      }
    }

    for (const [courseIndex, course] of courseFiles.entries()) {
      const courseId = `ja.course.${course.slug}`;
      const courseRow = {
        languageCode: japanese.code,
        slug: course.slug,
        title: course.title,
        description: course.description,
        sortOrder: courseIndex,
      };
      await upsert(db, tx, courses, { id: courseId, ...courseRow }, { target: [courses.id], set: courseRow });

      for (const [lessonIndex, lesson] of course.lessons.entries()) {
        const lessonId = `ja.lesson.${lesson.slug}`;
        const lessonRow = { courseId, slug: lesson.slug, title: lesson.title, sortOrder: lessonIndex };
        await upsert(
          db,
          tx,
          lessons,
          { id: lessonId, ...lessonRow },
          { target: [lessons.id], set: lessonRow },
        );

        await tx.delete(lessonItems).where(eq(lessonItems.lessonId, lessonId));
        await tx.insert(lessonItems).values(
          lesson.items.map((key, sortOrder) => {
            const contentItemId = idByKey.get(key);
            if (!contentItemId) throw new Error(`Lesson "${lesson.slug}" references unknown item "${key}"`);
            return { lessonId, contentItemId, sortOrder };
          }),
        );
        lessonCount++;
      }
    }
  });

  return { items: idByKey.size, lessons: lessonCount };
}
