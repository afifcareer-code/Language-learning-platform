import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { contentItems, courses, languages, lessonItems, lessons } from "@/server/db/schema";
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

  await db
    .insert(languages)
    .values({ code: japanese.code, name: japanese.name, nativeName: japanese.nativeName })
    .onConflictDoUpdate({
      target: languages.code,
      set: { name: japanese.name, nativeName: japanese.nativeName },
    });

  const idByKey = new Map<string, string>();
  for (const script of KANA_SCRIPTS) {
    const file = kanaFileSchema.parse(await readJson(join(root, "characters", `${script}.json`)));
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
      await db
        .insert(contentItems)
        .values({ id, ...row })
        .onConflictDoUpdate({ target: contentItems.id, set: row });
      idByKey.set(key, id);
    }
  }

  let lessonCount = 0;
  for (const [courseIndex, fileName] of COURSE_FILES.entries()) {
    const course = courseFileSchema.parse(await readJson(join(root, "curriculum", fileName)));
    const courseId = `ja.course.${course.slug}`;
    const courseRow = {
      languageCode: japanese.code,
      slug: course.slug,
      title: course.title,
      description: course.description,
      sortOrder: courseIndex,
    };
    await db
      .insert(courses)
      .values({ id: courseId, ...courseRow })
      .onConflictDoUpdate({ target: courses.id, set: courseRow });

    for (const [lessonIndex, lesson] of course.lessons.entries()) {
      const lessonId = `ja.lesson.${lesson.slug}`;
      const lessonRow = { courseId, slug: lesson.slug, title: lesson.title, sortOrder: lessonIndex };
      await db
        .insert(lessons)
        .values({ id: lessonId, ...lessonRow })
        .onConflictDoUpdate({ target: lessons.id, set: lessonRow });

      await db.delete(lessonItems).where(eq(lessonItems.lessonId, lessonId));
      await db.insert(lessonItems).values(
        lesson.items.map((key, sortOrder) => {
          const contentItemId = idByKey.get(key);
          if (!contentItemId) throw new Error(`Lesson "${lesson.slug}" references unknown item "${key}"`);
          return { lessonId, contentItemId, sortOrder };
        }),
      );
      lessonCount++;
    }
  }

  return { items: idByKey.size, lessons: lessonCount };
}
