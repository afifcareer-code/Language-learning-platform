import { z } from "zod";
import { ACTIVITY_TYPES, DIFFICULTIES, SUCCESS_CRITERIA } from "@/core/activities";
import { MASTERY_STATES } from "@/core/mastery";
import { localizedTextSchema } from "@/localization/content";

const slug = z.string().regex(/^[a-z0-9-]+$/);

/**
 * data/japanese/curriculum/levels.json: the levels of the language's
 * proficiency framework in order, each listing its courses (files in
 * curriculum/courses). A level may have no courses yet.
 */
export const levelsFileSchema = z.object({
  framework: z.string().regex(/^[a-z]+$/),
  levels: z
    .array(
      z.object({
        slug,
        /** Official code in the framework (e.g. "N5"); null for platform stages such as Foundation. */
        frameworkLevel: z.string().min(1).nullable(),
        courses: z.array(slug),
        title: localizedTextSchema,
        description: localizedTextSchema,
      }),
    )
    .min(1),
});

/** A course file under data/japanese/curriculum/courses. Lessons reference content by item key. */
export const courseFileSchema = z.object({
  slug,
  title: localizedTextSchema,
  description: localizedTextSchema,
  /** Name of the activity template file in data/japanese/activities used for every lesson. */
  activityTemplates: slug,
  lessons: z
    .array(z.object({ slug, title: localizedTextSchema, items: z.array(z.string().min(1)).min(1) }))
    .min(1),
});

const activityTextSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  instruction: z.string().min(1),
  explanation: z.string().min(1),
});

/** data/japanese/activities/<name>.json */
export const activityTemplateFileSchema = z.object({
  source: z.string(),
  templates: z
    .array(
      z.object({
        key: slug,
        type: z.enum(ACTIVITY_TYPES),
        skill: z.string().min(1),
        difficulty: z
          .number()
          .int()
          .min(DIFFICULTIES[0])
          .max(DIFFICULTIES[DIFFICULTIES.length - 1]!),
        successCriteria: z.array(z.enum(SUCCESS_CRITERIA)).min(1),
        passScore: z.number().min(0).max(1),
        targetMastery: z.enum(MASTERY_STATES),
        text: z
          .record(z.string(), activityTextSchema)
          .refine((v) => "en" in v, { message: 'An "en" text is required' }),
      }),
    )
    .min(1),
});

export type LevelsFile = z.infer<typeof levelsFileSchema>;
export type CourseFile = z.infer<typeof courseFileSchema>;
export type ActivityTemplateFile = z.infer<typeof activityTemplateFileSchema>;

/** Placeholders a kana activity template may use. */
export const KANA_TEMPLATE_PLACEHOLDERS = ["script", "characters", "lesson"] as const;
