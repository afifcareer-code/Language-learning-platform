import { and, eq, isNotNull } from "drizzle-orm";
import {
  computePracticeProgress,
  type PracticeProgress,
  type PracticeSkillSpec,
  type StageAttempt,
} from "@/core/practice";
import type { ContentItem } from "@/core/learning";
import { getLanguageModule } from "@/languages/registry";
import type { Database } from "../db/client";
import { listContentItemsByType } from "../repositories/content";
import type { Learner } from "../repositories/learners";
import { getPracticeLevels } from "./practice-level";

export interface PracticeSkillOverview {
  skill: PracticeSkillSpec;
  progress: PracticeProgress;
  /** Stages whose content is above the learner's level, with the level code they open at. */
  opensAt: Record<string, string>;
}

/** The attempts that belong to Practice, grouped by skill: `practice_stage` is "<skill>.<stage>". */
export async function getPracticeAttempts(
  db: Database,
  learnerId: string,
): Promise<Map<string, StageAttempt[]>> {
  const { learningAttempts } = db.t;
  const rows = await db
    .select({
      stage: learningAttempts.practiceStage,
      score: learningAttempts.score,
      at: learningAttempts.createdAt,
    })
    .from(learningAttempts)
    .where(and(eq(learningAttempts.learnerId, learnerId), isNotNull(learningAttempts.practiceStage)));
  const bySkill = new Map<string, StageAttempt[]>();
  for (const row of rows) {
    const [skillId, ...rest] = (row.stage ?? "").split(".");
    if (!skillId || rest.length === 0) continue;
    bySkill.set(skillId, [
      ...(bySkill.get(skillId) ?? []),
      { stageId: rest.join("."), score: row.score, at: row.at },
    ]);
  }
  return bySkill;
}

/**
 * Where the learner stands on every Practice skill. Independent of the curriculum:
 * it reads only Practice attempts, and the stage rules are the language's data.
 */
export async function getPracticeOverview(db: Database, learner: Learner): Promise<PracticeSkillOverview[]> {
  const framework = getLanguageModule(learner.targetLanguage).practice;
  if (!framework) return [];
  const attempts = await getPracticeAttempts(db, learner.id);
  const levels = await getPracticeLevels(db, learner);
  const pools = new Map<string, ContentItem[]>();
  const poolOf = async (type: string) => {
    if (!pools.has(type)) pools.set(type, await listContentItemsByType(db, learner.targetLanguage, type));
    return pools.get(type)!;
  };
  const overview: PracticeSkillOverview[] = [];
  for (const skill of framework.skills) {
    const opensAt: Record<string, string> = {};
    const stages: PracticeSkillSpec["stages"] = [];
    for (const stage of skill.stages) {
      let gated = false;
      if (stage.availability === "available" && stage.session) {
        const spec = stage.session;
        const matching = (await poolOf(spec.itemType)).filter((i) =>
          Object.entries(spec.dataEquals ?? {}).every(
            ([key, value]) => (i.data as Record<string, unknown>)[key] === value,
          ),
        );
        if (matching.length > 0 && !matching.some((i) => levels.allows(i))) {
          const lowest = matching.reduce((a, b) => (levels.orderOf(b) < levels.orderOf(a) ? b : a));
          opensAt[stage.id] = levels.codeOf(lowest) ?? "";
          gated = true;
        }
      }
      // A stage above the learner's level is treated like a planned one: listed, never offered.
      stages.push(gated ? { ...stage, availability: "planned" } : stage);
    }
    overview.push({
      skill,
      progress: computePracticeProgress({ ...skill, stages }, attempts.get(skill.id) ?? []),
      opensAt,
    });
  }
  return overview;
}
