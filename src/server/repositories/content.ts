import { and, asc, eq, inArray } from "drizzle-orm";
import type { ContentItem } from "@/core/learning";
import type { Database } from "../db/client";
import { contentItems, courses, lessonItems, lessons } from "../db/schema";

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
  const [row] = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  return row ? toContentItem(row) : null;
}

/** Fetch items by id, preserving the order of `ids`. */
export async function getContentItems(db: Database, ids: readonly string[]): Promise<ContentItem[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(contentItems)
    .where(inArray(contentItems.id, [...ids]));
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
    .from(contentItems)
    .where(and(eq(contentItems.languageCode, languageCode), eq(contentItems.type, type)))
    .orderBy(asc(contentItems.sortOrder));
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
      course: courses,
      lesson: { id: lessons.id, slug: lessons.slug, title: lessons.title },
      itemId: lessonItems.contentItemId,
    })
    .from(courses)
    .innerJoin(lessons, eq(lessons.courseId, courses.id))
    .innerJoin(lessonItems, eq(lessonItems.lessonId, lessons.id))
    .where(eq(courses.languageCode, languageCode))
    .orderBy(asc(courses.sortOrder), asc(lessons.sortOrder), asc(lessonItems.sortOrder));

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
    .select({ id: lessons.id, slug: lessons.slug, title: lessons.title, itemId: lessonItems.contentItemId })
    .from(lessons)
    .innerJoin(lessonItems, eq(lessonItems.lessonId, lessons.id))
    .where(eq(lessons.slug, slug))
    .orderBy(asc(lessonItems.sortOrder));
  const first = rows[0];
  if (!first) return null;
  return { id: first.id, slug: first.slug, title: first.title, itemIds: rows.map((r) => r.itemId) };
}
