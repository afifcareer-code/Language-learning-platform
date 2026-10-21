import { asc, eq, inArray } from "drizzle-orm";
import type {
  ActivityDefinition,
  ActivityText,
  ActivityType,
  Difficulty,
  EvaluationStrategy,
  SuccessCriterion,
} from "@/core/activities";
import type { MasteryState } from "@/core/mastery";
import { pickTranslation, type Locale } from "@/localization/config";
import type { Database } from "../db/client";

/**
 * The curriculum (Level → Course → Lesson → Activity) with text resolved for
 * one locale. Translations fall back to the content source locale.
 */

export interface ActivityView extends ActivityDefinition {
  text: ActivityText;
}

export interface LessonView {
  id: string;
  slug: string;
  title: string;
  /** The lesson objective: what the learner can do after it. */
  objective: string | null;
  /** The situation the lesson's language is used in. */
  situation: string | null;
  itemIds: string[];
  activities: ActivityView[];
}

export interface CourseView {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  lessons: LessonView[];
}

export interface LevelView {
  id: string;
  slug: string;
  /** Official framework code (e.g. "N5"), or null for platform stages such as Foundation. */
  frameworkLevel: string | null;
  title: string;
  description: string | null;
  courses: CourseView[];
}

export interface Curriculum {
  levels: LevelView[];
  lessons: LessonView[];
  activities: ActivityView[];
}

function group<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) map.set(key(row), [...(map.get(key(row)) ?? []), row]);
  return map;
}

export async function getCurriculum(db: Database, languageCode: string, locale: Locale): Promise<Curriculum> {
  const t = db.t;
  const levels = await db
    .select()
    .from(t.levels)
    .where(eq(t.levels.languageCode, languageCode))
    .orderBy(asc(t.levels.sortOrder));
  const courses = await db
    .select()
    .from(t.courses)
    .where(eq(t.courses.languageCode, languageCode))
    .orderBy(asc(t.courses.sortOrder));
  const courseIds = courses.map((c) => c.id);
  if (courseIds.length === 0) return { levels: [], lessons: [], activities: [] };

  const lessons = await db
    .select()
    .from(t.lessons)
    .where(inArray(t.lessons.courseId, courseIds))
    .orderBy(asc(t.lessons.sortOrder));
  const lessonIds = lessons.map((l) => l.id);
  const [levelText, courseText, lessonText, lessonItems, activities] = await Promise.all([
    db.select().from(t.levelTranslations),
    db.select().from(t.courseTranslations).where(inArray(t.courseTranslations.courseId, courseIds)),
    lessonIds.length
      ? db.select().from(t.lessonTranslations).where(inArray(t.lessonTranslations.lessonId, lessonIds))
      : [],
    lessonIds.length
      ? db
          .select()
          .from(t.lessonItems)
          .where(inArray(t.lessonItems.lessonId, lessonIds))
          .orderBy(asc(t.lessonItems.sortOrder))
      : [],
    lessonIds.length
      ? db
          .select()
          .from(t.activities)
          .where(inArray(t.activities.lessonId, lessonIds))
          .orderBy(asc(t.activities.sortOrder))
      : [],
  ]);
  const activityIds = activities.map((a) => a.id);
  const [activityItems, activityText] = await Promise.all([
    activityIds.length
      ? db
          .select()
          .from(t.activityItems)
          .where(inArray(t.activityItems.activityId, activityIds))
          .orderBy(asc(t.activityItems.sortOrder))
      : [],
    activityIds.length
      ? db
          .select()
          .from(t.activityTranslations)
          .where(inArray(t.activityTranslations.activityId, activityIds))
      : [],
  ]);

  const levelTextBy = group(levelText, (r) => r.levelId);
  const courseTextBy = group(courseText, (r) => r.courseId);
  const lessonTextBy = group(lessonText, (r) => r.lessonId);
  const lessonItemsBy = group(lessonItems, (r) => r.lessonId);
  const activityItemsBy = group(activityItems, (r) => r.activityId);
  const activityTextBy = group(activityText, (r) => r.activityId);
  const activitiesBy = group(activities, (r) => r.lessonId);

  const allActivities: ActivityView[] = [];
  const allLessons: LessonView[] = [];

  const lessonViews = (courseId: string): LessonView[] =>
    lessons
      .filter((l) => l.courseId === courseId)
      .map((l) => {
        const lessonActivities = (activitiesBy.get(l.id) ?? []).map((a): ActivityView => {
          const text = pickTranslation(activityTextBy.get(a.id) ?? [], locale);
          return {
            id: a.id,
            languageCode: a.languageCode,
            lessonId: a.lessonId,
            type: a.type as ActivityType,
            skill: a.skill,
            difficulty: a.difficulty as Difficulty,
            evaluation: a.evaluation as EvaluationStrategy,
            successCriteria: a.successCriteria as SuccessCriterion[],
            passScore: a.passScore,
            targetMastery: a.targetMastery as MasteryState,
            contentItemIds: (activityItemsBy.get(a.id) ?? []).map((i) => i.contentItemId),
            sortOrder: a.sortOrder,
            text: {
              title: text?.title ?? a.id,
              objective: text?.objective ?? "",
              instruction: text?.instruction ?? "",
              explanation: text?.explanation ?? "",
            },
          };
        });
        allActivities.push(...lessonActivities);
        const text = pickTranslation(lessonTextBy.get(l.id) ?? [], locale);
        const view: LessonView = {
          id: l.id,
          slug: l.slug,
          title: text?.title ?? l.slug,
          objective: text?.objective ?? null,
          situation: text?.description ?? null,
          itemIds: (lessonItemsBy.get(l.id) ?? []).map((i) => i.contentItemId),
          activities: lessonActivities,
        };
        allLessons.push(view);
        return view;
      });

  const courseView = (c: (typeof courses)[number]): CourseView => {
    const text = pickTranslation(courseTextBy.get(c.id) ?? [], locale);
    return {
      id: c.id,
      slug: c.slug,
      title: text?.title ?? c.slug,
      description: text?.description ?? null,
      lessons: lessonViews(c.id),
    };
  };

  const levelViews: LevelView[] = levels.map((level) => {
    const text = pickTranslation(levelTextBy.get(level.id) ?? [], locale);
    return {
      id: level.id,
      slug: level.slug,
      frameworkLevel: level.frameworkLevel,
      title: text?.title ?? level.slug,
      description: text?.description ?? null,
      courses: courses.filter((c) => c.levelId === level.id).map(courseView),
    };
  });
  // Courses not yet assigned to a level still appear, under an untitled level.
  const unassigned = courses.filter((c) => !c.levelId || !levels.some((l) => l.id === c.levelId));
  if (unassigned.length) {
    levelViews.push({
      id: "",
      slug: "",
      frameworkLevel: null,
      title: "",
      description: null,
      courses: unassigned.map(courseView),
    });
  }

  return { levels: levelViews, lessons: allLessons, activities: allActivities };
}

export interface LessonLocation {
  level: LevelView;
  course: CourseView;
  lesson: LessonView;
  /** 1-based position of the lesson in its course. */
  number: number;
}

/** Where a lesson sits in the curriculum: its level, course and number. */
export function locateLesson(curriculum: Curriculum, lessonId: string): LessonLocation | null {
  for (const level of curriculum.levels)
    for (const course of level.courses) {
      const index = course.lessons.findIndex((l) => l.id === lessonId);
      if (index >= 0) return { level, course, lesson: course.lessons[index]!, number: index + 1 };
    }
  return null;
}
