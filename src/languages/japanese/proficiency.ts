import { z } from "zod";
import type { ProficiencyLevelSpec } from "@/core/proficiency";
import { localizedTextSchema } from "@/localization/content";
import framework from "../../../data/japanese/proficiency/framework.json";
import n5 from "../../../data/japanese/proficiency/n5.json";

const slug = z.string().regex(/^[a-z0-9-]+$/);
const skill = z.string().regex(/^[a-z]+(\.[a-z0-9-]+)+$/);
const share = z.number().min(0).max(1);

export const frameworkFileSchema = z.object({
  levels: z.array(
    z.object({
      level: slug,
      frameworkLevel: z.string(),
      prerequisite: slug,
      cefrReference: z.string(),
      status: z.enum(["implemented", "planned"]),
      domains: z.array(slug).min(1),
      summary: localizedTextSchema,
    }),
  ),
});

export const levelSpecFileSchema = z
  .object({
    level: slug,
    prerequisiteLevel: slug,
    prerequisiteSkills: z.array(skill).min(1),
    domains: z.array(slug).min(1),
    thresholds: z.object({
      secureShare: share,
      retainedShare: share,
      prerequisiteShare: share,
      sectionPass: share,
      overallPass: share,
    }),
    competencies: z
      .array(
        z.object({
          id: z.string().min(1),
          domain: slug,
          skills: z.array(skill),
          availability: z.enum(["available", "planned"]),
          examAligned: z.boolean(),
          title: localizedTextSchema,
        }),
      )
      .min(1),
    assessment: z.object({
      sections: z.array(
        z.object({
          id: slug,
          domain: slug,
          skill,
          questionCount: z.number().int().positive(),
          timeLimitSeconds: z.number().int().positive().optional(),
        }),
      ),
    }),
  })
  .superRefine((spec, ctx) => {
    for (const c of spec.competencies) {
      if (!spec.domains.includes(c.domain))
        ctx.addIssue({ code: "custom", message: `${c.id}: unknown domain ${c.domain}` });
      if (c.availability === "available" && c.skills.length === 0)
        ctx.addIssue({ code: "custom", message: `${c.id}: an available competency needs skills` });
    }
    for (const s of spec.assessment.sections) {
      if (!spec.domains.includes(s.domain))
        ctx.addIssue({ code: "custom", message: `section ${s.id}: unknown domain ${s.domain}` });
      const measured = spec.competencies.some((c) => c.domain === s.domain && c.skills.includes(s.skill));
      if (!measured)
        ctx.addIssue({ code: "custom", message: `section ${s.id}: no competency measures ${s.skill}` });
    }
  });

export type JapaneseFramework = z.infer<typeof frameworkFileSchema>;
export type JapaneseLevelFile = z.infer<typeof levelSpecFileSchema>;

const specs: Record<string, JapaneseLevelFile> = { n5: levelSpecFileSchema.parse(n5) };

export function japaneseFramework(): JapaneseFramework {
  return frameworkFileSchema.parse(framework);
}

/** The proficiency specification of a level, or null while the level has none. */
export function japaneseLevelSpec(level: string): ProficiencyLevelSpec | null {
  const file = specs[level];
  if (!file) return null;
  return {
    level: file.level,
    prerequisiteLevel: file.prerequisiteLevel,
    prerequisiteSkills: file.prerequisiteSkills,
    domains: file.domains,
    competencies: file.competencies,
    thresholds: file.thresholds,
    assessment: file.assessment,
  };
}
