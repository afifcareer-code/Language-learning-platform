import {
  evaluationFor,
  type ActivityDefinition,
  type ActivityText,
  type Difficulty,
} from "@/core/activities";
import { fillPlaceholders } from "@/localization/content";
import type { ActivityTemplateFile, CourseFile } from "./schema";

export interface ExpandedActivity {
  definition: ActivityDefinition;
  /** Localized text per locale. */
  text: Record<string, ActivityText>;
}

/** A lesson's items of one content type. */
export interface LessonItems {
  ids: string[];
  /** How the items read, joined for titles, e.g. "あ い う え お". */
  characters: string;
}

export function activityId(lessonSlug: string, templateKey: string): string {
  return `ja.activity.${lessonSlug}.${templateKey}`;
}

/**
 * Create the concrete activities of one lesson from a template file. Each
 * template uses the lesson's items of its content type and is skipped when
 * the lesson has none. Fills {script}, {characters}, {lesson} and {count}.
 */
export function expandLessonActivities(
  lesson: CourseFile["lessons"][number] & { id: string },
  templates: ActivityTemplateFile,
  context: {
    itemsByType: Record<string, LessonItems>;
    /** Localized script name per locale for kana lessons, e.g. { en: "Hiragana" }. */
    scriptName?: Record<string, string>;
  },
): ExpandedActivity[] {
  const activities: ExpandedActivity[] = [];
  for (const template of templates.templates) {
    const items = context.itemsByType[template.contentType];
    if (!items?.ids.length) continue;
    const text: Record<string, ActivityText> = {};
    for (const [locale, t] of Object.entries(template.text)) {
      const vars = {
        script: context.scriptName?.[locale] ?? context.scriptName?.en ?? "",
        characters: items.characters,
        lesson: lesson.title[locale] ?? lesson.title.en ?? "",
        count: String(items.ids.length),
      };
      text[locale] = {
        title: fillPlaceholders(t.title, vars),
        objective: fillPlaceholders(t.objective, vars),
        instruction: fillPlaceholders(t.instruction, vars),
        explanation: fillPlaceholders(t.explanation, vars),
      };
    }
    activities.push({
      definition: {
        id: activityId(lesson.slug, template.key),
        languageCode: "ja",
        lessonId: lesson.id,
        type: template.type,
        skill: template.skill,
        difficulty: template.difficulty as Difficulty,
        evaluation: evaluationFor(template.type),
        successCriteria: template.successCriteria,
        passScore: template.passScore,
        targetMastery: template.targetMastery,
        contentItemIds: items.ids,
        sortOrder: activities.length,
      },
      text,
    });
  }
  return activities;
}
