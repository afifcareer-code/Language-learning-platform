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

export function activityId(lessonSlug: string, templateKey: string): string {
  return `ja.activity.${lessonSlug}.${templateKey}`;
}

/**
 * Create the concrete activities of one lesson from a template file, filling
 * {script}, {characters} and {lesson} per locale.
 */
export function expandLessonActivities(
  lesson: CourseFile["lessons"][number] & { id: string },
  templates: ActivityTemplateFile,
  context: {
    contentItemIds: string[];
    characters: string;
    /** Localized script name per locale, e.g. { en: "Hiragana" }. */
    scriptName: Record<string, string>;
  },
): ExpandedActivity[] {
  return templates.templates.map((template, index) => {
    const text: Record<string, ActivityText> = {};
    for (const [locale, t] of Object.entries(template.text)) {
      const vars = {
        script: context.scriptName[locale] ?? context.scriptName.en ?? "",
        characters: context.characters,
        lesson: lesson.title[locale] ?? lesson.title.en ?? "",
      };
      text[locale] = {
        title: fillPlaceholders(t.title, vars),
        objective: fillPlaceholders(t.objective, vars),
        instruction: fillPlaceholders(t.instruction, vars),
        explanation: fillPlaceholders(t.explanation, vars),
      };
    }
    return {
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
        contentItemIds: context.contentItemIds,
        sortOrder: index,
      },
      text,
    };
  });
}
