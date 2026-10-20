import { and, asc, eq, inArray } from "drizzle-orm";
import type { ContentItem } from "@/core/learning";
import type { Database } from "../db/client";
import type { contentItems } from "../db/schema/sqlite";

type ContentRow = typeof contentItems.$inferSelect;

function toContentItem(row: ContentRow): ContentItem {
  return {
    id: row.id,
    languageCode: row.languageCode,
    type: row.type,
    key: row.key,
    data: row.data,
    tags: row.tags,
  };
}

export async function getContentItem(db: Database, id: string): Promise<ContentItem | null> {
  const [row] = await db.select().from(db.t.contentItems).where(eq(db.t.contentItems.id, id)).limit(1);
  return row ? toContentItem(row) : null;
}

/** Fetch items by id, preserving the order of `ids`. */
export async function getContentItems(db: Database, ids: readonly string[]): Promise<ContentItem[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(db.t.contentItems)
    .where(inArray(db.t.contentItems.id, [...ids]));
  const byId = new Map(rows.map((r) => [r.id, toContentItem(r)]));
  return ids.map((id) => byId.get(id)).filter((i): i is ContentItem => Boolean(i));
}

export async function listContentItemsByType(
  db: Database,
  languageCode: string,
  type: string,
): Promise<ContentItem[]> {
  const rows = await db
    .select()
    .from(db.t.contentItems)
    .where(and(eq(db.t.contentItems.languageCode, languageCode), eq(db.t.contentItems.type, type)))
    .orderBy(asc(db.t.contentItems.sortOrder));
  return rows.map(toContentItem);
}

export interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  itemIds: string[];
}

export interface CourseWithLessons {
  id: string;
  slug: string;
  title: string;
  description: string;
  lessons: LessonSummary[];
}

export async function listCourses(db: Database, languageCode: string): Promise<CourseWithLessons[]> {
  const rows = await db
    .select({
      course: db.t.courses,
      lesson: { id: db.t.lessons.id, slug: db.t.lessons.slug, title: db.t.lessons.title },
      itemId: db.t.lessonItems.contentItemId,
    })
    .from(db.t.courses)
    .innerJoin(db.t.lessons, eq(db.t.lessons.courseId, db.t.courses.id))
    .innerJoin(db.t.lessonItems, eq(db.t.lessonItems.lessonId, db.t.lessons.id))
    .where(eq(db.t.courses.languageCode, languageCode))
    .orderBy(asc(db.t.courses.sortOrder), asc(db.t.lessons.sortOrder), asc(db.t.lessonItems.sortOrder));

  const result: CourseWithLessons[] = [];
  for (const row of rows) {
    let course = result.at(-1);
    if (course?.id !== row.course.id) {
      course = {
        id: row.course.id,
        slug: row.course.slug,
        title: row.course.title,
        description: row.course.description,
        lessons: [],
      };
      result.push(course);
    }
    let lesson = course.lessons.at(-1);
    if (lesson?.id !== row.lesson.id) {
      lesson = { ...row.lesson, itemIds: [] };
      course.lessons.push(lesson);
    }
    lesson.itemIds.push(row.itemId);
  }
  return result;
}

export async function getLessonBySlug(db: Database, slug: string): Promise<LessonSummary | null> {
  const rows = await db
    .select({
      id: db.t.lessons.id,
      slug: db.t.lessons.slug,
      title: db.t.lessons.title,
      itemId: db.t.lessonItems.contentItemId,
    })
    .from(db.t.lessons)
    .innerJoin(db.t.lessonItems, eq(db.t.lessonItems.lessonId, db.t.lessons.id))
    .where(eq(db.t.lessons.slug, slug))
    .orderBy(asc(db.t.lessonItems.sortOrder));
  const first = rows[0];
  if (!first) return null;
  return { id: first.id, slug: first.slug, title: first.title, itemIds: rows.map((r) => r.itemId) };
}
