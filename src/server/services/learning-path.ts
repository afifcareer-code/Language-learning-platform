import type { ActivityStatus } from "@/core/activities";
import type { Curriculum, LevelView } from "../repositories/curriculum";

/**
 * Where each level stands for a learner:
 * - current: the level they are working in;
 * - completed: every activity in it is completed;
 * - in_progress: some activities are completed, but it is not the current level;
 * - recommended: the next level with curriculum once the current one is completed;
 * - available: has curriculum and can be chosen;
 * - locked: no curriculum yet (in development).
 */
export type LevelStatus = "current" | "completed" | "in_progress" | "recommended" | "available" | "locked";

export interface LevelOnPath {
  level: LevelView;
  status: LevelStatus;
  completedActivities: number;
  totalActivities: number;
}

const DONE: ReadonlySet<ActivityStatus> = new Set(["completed", "outcome_achieved"]);

export function learningPath(
  curriculum: Curriculum,
  statuses: ReadonlyMap<string, ActivityStatus>,
  currentLevelId: string,
): LevelOnPath[] {
  const path = curriculum.levels
    .filter((level) => level.id)
    .map((level): LevelOnPath => {
      const activities = level.courses.flatMap((c) => c.lessons.flatMap((l) => l.activities));
      const completedActivities = activities.filter((a) =>
        DONE.has(statuses.get(a.id) ?? "not_started"),
      ).length;
      const totalActivities = activities.length;
      const status: LevelStatus =
        totalActivities === 0
          ? "locked"
          : level.id === currentLevelId
            ? "current"
            : completedActivities === totalActivities
              ? "completed"
              : completedActivities > 0
                ? "in_progress"
                : "available";
      return { level, status, completedActivities, totalActivities };
    });

  const current = path.findIndex((p) => p.level.id === currentLevelId);
  const currentDone = current >= 0 && path[current]!.completedActivities === path[current]!.totalActivities;
  if (currentDone) {
    const next = path.slice(current + 1).find((p) => p.status === "available");
    if (next) next.status = "recommended";
  }
  return path;
}
