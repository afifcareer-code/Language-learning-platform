import { z } from "zod";
import { ACTIVITY_TYPES } from "@/core/activities";
import { CAPABILITIES } from "@/core/learning";
import { validatePracticeSkill, type PracticeFrameworkSpec } from "@/core/practice";
import framework from "../../../data/japanese/practice/framework.json";

const id = z.string().regex(/^[a-z0-9-]+$/);
const share = z.number().min(0).max(1);

const requirement = z.object({
  minAttempts: z.number().int().positive(),
  window: z.number().int().positive(),
  promoteAt: share,
  demoteBelow: share,
});

export const practiceFileSchema = z.object({
  skills: z
    .array(
      z.object({
        id,
        capability: z.enum(CAPABILITIES),
        stages: z
          .array(
            z.object({
              id,
              focus: id,
              availability: z.enum(["available", "planned"]),
              requirement,
              session: z
                .object({
                  skill: z.string().regex(/^[a-z]+(\.[a-z0-9-]+)+$/),
                  type: z.enum(ACTIVITY_TYPES),
                  itemType: z.string().min(1),
                  dataEquals: z.record(z.string(), z.string()).optional(),
                  ownOptions: z.boolean().optional(),
                })
                .optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

const parsed = practiceFileSchema.parse(framework);
const problems = parsed.skills.flatMap(validatePracticeSkill);
if (problems.length) throw new Error(`Invalid Japanese practice framework:\n${problems.join("\n")}`);

/** The Japanese practice skills: stages ordered by complexity, independent of JLPT level. */
export const japanesePractice: PracticeFrameworkSpec = parsed;
