import { and, eq, isNotNull } from "drizzle-orm";
import {
  computePracticeProgress,
  type PracticeProgress,
  type PracticeSkillSpec,
  type StageAttempt,
} from "@/core/practice";
import { getLanguageModule } from "@/languages/registry";
import type { Database } from "../db/client";
import type { Learner } from "../repositories/learners";

export interface PracticeSkillOverview {
  skill: PracticeSkillSpec;
  progress: PracticeProgress;
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
  return framework.skills.map((skill) => ({
    skill,
    progress: computePracticeProgress(skill, attempts.get(skill.id) ?? []),
  }));
}
