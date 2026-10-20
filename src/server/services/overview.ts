import {
  attemptAccuracy,
  courseProgress,
  learningReadiness,
  masteryDistribution,
  needsRemediation,
  skillMastery,
  type ConfusionPairState,
  type CourseProgress,
  type LearningReadiness,
  type MasteryDistribution,
  type SkillMastery,
} from "@/core/analytics";
import { activityStatus, type ActivityStatus } from "@/core/activities";
import type { SkillDefinition } from "@/core/learning";
import type { MasteryState } from "@/core/mastery";
import { recommendNext, type Recommendation } from "@/core/recommendation";
import { getLanguageModule } from "@/languages/registry";
import type { Locale } from "@/localization/config";
import type { Database } from "../db/client";
import {
  getCurriculum,
  type ActivityView,
  type Curriculum,
  type LessonView,
} from "../repositories/curriculum";
import type { Learner } from "../repositories/learners";
import {
  getConfusionPairs,
  getDueReviews,
  getLearnerProgress,
  getRecentAttempts,
  progressKey,
  type ItemProgress,
} from "../repositories/progress";

export interface LearningOverview {
  skills: readonly SkillDefinition[];
  curriculum: Curriculum;
  progress: Map<string, ItemProgress>;
  activityStatus: Map<string, ActivityStatus>;
  /** The next activity to work on, in curriculum order. */
  nextActivity: ActivityView | null;
  currentLesson: LessonView | null;
  courseProgress: CourseProgress;
  /** Across every (item, skill) pair in the curriculum. */
  overallMastery: SkillMastery;
  skillMastery: SkillMastery[];
  readiness: (LearningReadiness & { lesson: LessonView }) | null;
  confusionPairs: ConfusionPairState[];
  dueBySkill: Record<string, number>;
  distributionBySkill: Record<string, MasteryDistribution>;
  recommendations: Recommendation[];
  last7Days: { attempts: number; accuracy: number | null };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function stateFor(progress: Map<string, ItemProgress>, itemId: string, skill: string): MasteryState {
  return progress.get(progressKey(itemId, skill))?.state ?? "not_started";
}

/**
 * Everything the dashboard needs. With `levelId`, the next activity, progress,
 * mastery and readiness are computed for that level only; activity statuses
 * cover the whole curriculum.
 */
export async function getLearningOverview(
  db: Database,
  learner: Learner,
  locale: Locale,
  now = new Date(),
  levelId?: string,
): Promise<LearningOverview> {
  const skills = getLanguageModule(learner.targetLanguage).skills;
  const [curriculum, progress, due, recent, pairs] = await Promise.all([
    getCurriculum(db, learner.targetLanguage, locale),
    getLearnerProgress(db, learner.id, now),
    getDueReviews(db, learner.id, now),
    getRecentAttempts(db, learner.id, { since: new Date(now.getTime() - 7 * DAY_MS), limit: 10_000 }),
    getConfusionPairs(db, learner.id),
  ]);
  const stateOf = (itemId: string, skill: string) => stateFor(progress, itemId, skill);

  const statuses = new Map<string, ActivityStatus>();
  for (const a of curriculum.activities)
    statuses.set(
      a.id,
      activityStatus(a, (id) => stateOf(id, a.skill)),
    );
  const level = levelId ? curriculum.levels.find((l) => l.id === levelId) : undefined;
  const lessons = level ? level.courses.flatMap((c) => c.lessons) : curriculum.lessons;
  const activities = lessons.flatMap((l) => l.activities);

  const nextActivity =
    activities.find((a) => !["completed", "outcome_achieved"].includes(statuses.get(a.id)!)) ?? null;
  const currentLesson = lessons.find((l) => l.id === nextActivity?.lessonId) ?? lessons.at(-1) ?? null;

  const allItemIds = [...new Set(lessons.flatMap((l) => l.itemIds))];
  const bySkill = skills.map((s) => skillMastery(s.id, allItemIds, stateOf));
  const demonstrated = bySkill.reduce((n, s) => n + s.demonstrated, 0);
  const total = bySkill.reduce((n, s) => n + s.total, 0);

  const readiness = currentLesson
    ? {
        lesson: currentLesson,
        ...learningReadiness(
          currentLesson.itemIds,
          [...new Set(currentLesson.activities.map((a) => a.skill))],
          stateOf,
        ),
      }
    : null;

  const dueBySkill: Record<string, number> = Object.fromEntries(skills.map((s) => [s.id, 0]));
  for (const d of due) dueBySkill[d.skill] = (dueBySkill[d.skill] ?? 0) + 1;

  const distributionBySkill: Record<string, MasteryDistribution> = {};
  for (const s of skills) {
    const states = allItemIds.flatMap((id) => {
      const p = progress.get(progressKey(id, s.id));
      return p ? [p.state] : [];
    });
    distributionBySkill[s.id] = masteryDistribution(states, allItemIds.length);
  }

  // Weak = the most recent attempt was wrong, or retention has lapsed (and not already due).
  const isDue = (p: ItemProgress) =>
    due.some((d) => d.contentItemId === p.contentItemId && d.skill === p.skill);
  const weakItems = [...progress.values()]
    .filter(
      (p) =>
        (p.state === "needs_review" || (p.mastery.attempts > 0 && p.mastery.consecutiveCorrect === 0)) &&
        !isDue(p),
    )
    .map((p) => ({
      contentItemId: p.contentItemId,
      skill: p.skill,
      state: p.state === "needs_review" ? p.state : ("learning" as const),
    }));

  const recommendations = recommendNext({
    dueReviews: Object.entries(dueBySkill).map(([skill, count]) => ({ skill, count })),
    weakItems,
    confusionPairs: pairs.filter((p) => needsRemediation(p)),
    nextActivity: nextActivity ? { id: nextActivity.id, skill: nextActivity.skill } : null,
  });

  return {
    skills,
    curriculum,
    progress,
    activityStatus: statuses,
    nextActivity,
    currentLesson,
    courseProgress: courseProgress(activities, stateOf),
    overallMastery: { skill: "*", demonstrated, total, ratio: total ? demonstrated / total : 0 },
    skillMastery: bySkill,
    readiness,
    confusionPairs: pairs,
    dueBySkill,
    distributionBySkill,
    recommendations,
    last7Days: { attempts: recent.length, accuracy: attemptAccuracy(recent) },
  };
}
