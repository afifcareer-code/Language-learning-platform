import type {
  PracticeProgress,
  PracticeReason,
  PracticeSkillSpec,
  PracticeStageSpec,
  StageAttempt,
  StageProgress,
  StageRequirement,
} from "./types";

/** Mean score of the latest `window` attempts, or null while there is too little evidence. */
export function stageMastery(attempts: readonly StageAttempt[], req: StageRequirement): number | null {
  if (attempts.length < req.minAttempts) return null;
  const recent = [...attempts].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, req.window);
  return recent.reduce((sum, a) => sum + a.score, 0) / recent.length;
}

/**
 * Where a learner should practise next on a skill.
 *
 * The rule is evidence-based and has no memory beyond the attempts: a stage is
 * passed while its recent mean is at the pass level, so a stage that falls
 * back below it stops counting and the learner returns to it by themselves.
 * The first stage that is not passed is the working stage. When recent
 * performance there is below the demotion level the learner is sent one
 * available stage back first, because the weakness is usually in the stage
 * below. Stages that are planned are skipped.
 */
export function computePracticeProgress(
  skill: PracticeSkillSpec,
  attempts: readonly StageAttempt[],
): PracticeProgress {
  const byStage = new Map<string, StageAttempt[]>();
  for (const a of attempts) byStage.set(a.stageId, [...(byStage.get(a.stageId) ?? []), a]);

  const available = skill.stages.filter((s) => s.availability === "available");
  const measured = new Map<string, { attempts: number; mastery: number | null }>(
    skill.stages.map((s) => {
      const own = byStage.get(s.id) ?? [];
      return [s.id, { attempts: own.length, mastery: stageMastery(own, s.requirement) }];
    }),
  );
  const passed = (s: PracticeStageSpec) => {
    const m = measured.get(s.id)!.mastery;
    return m !== null && m >= s.requirement.promoteAt;
  };
  const weak = (s: PracticeStageSpec) => {
    const m = measured.get(s.id)!.mastery;
    return m !== null && m < s.requirement.demoteBelow;
  };

  const firstOpen = available.find((s) => !passed(s));
  const allPassed = firstOpen === undefined;
  const working = firstOpen ?? available[available.length - 1]!;
  const workingIndex = available.indexOf(working);

  let target = working;
  let reason: PracticeReason;
  let weakStageId: string | null = null;
  if (allPassed) {
    reason = "mastered";
  } else if (weak(working)) {
    weakStageId = working.id;
    if (workingIndex > 0) {
      target = available[workingIndex - 1]!;
      reason = "regress";
    } else {
      reason = "retry";
    }
  } else if (measured.get(working.id)!.attempts > 0) {
    reason = "continue";
  } else if (workingIndex > 0) {
    reason = "advance";
  } else {
    reason = "start";
  }

  const stages: StageProgress[] = skill.stages.map((s) => {
    const m = measured.get(s.id)!;
    let status: StageProgress["status"];
    if (s.availability === "planned") status = "planned";
    else if (passed(s)) status = "passed";
    else if (s.id === working.id) status = weak(s) ? "needs_work" : "current";
    else if (weak(s)) status = "needs_work";
    else status = available.indexOf(s) > workingIndex ? "locked" : "current";
    return { stageId: s.id, status, attempts: m.attempts, mastery: m.mastery };
  });

  return {
    skillId: skill.id,
    stages,
    nextStageId: target.id,
    nextStageNumber: skill.stages.findIndex((s) => s.id === target.id) + 1,
    reason,
    weakStageId,
  };
}

/** Structural checks on a framework: ordered, unique ids, and a session for every available stage. */
export function validatePracticeSkill(skill: PracticeSkillSpec): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const s of skill.stages) {
    if (seen.has(s.id)) problems.push(`${skill.id}: duplicate stage ${s.id}`);
    seen.add(s.id);
    if (s.availability === "available" && !s.session) problems.push(`${skill.id}/${s.id}: no session`);
    if (s.requirement.demoteBelow > s.requirement.promoteAt)
      problems.push(`${skill.id}/${s.id}: demoteBelow above promoteAt`);
    if (s.requirement.window < s.requirement.minAttempts)
      problems.push(`${skill.id}/${s.id}: window smaller than minAttempts`);
  }
  if (!skill.stages.some((s) => s.availability === "available"))
    problems.push(`${skill.id}: no stage available`);
  return problems;
}
