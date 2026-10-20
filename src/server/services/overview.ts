import { attemptAccuracy, masteryDistribution, type MasteryDistribution } from "@/core/analytics";
import type { SkillDefinition } from "@/core/learning";
import type { MasteryState } from "@/core/mastery";
import { recommendNext, type Recommendation } from "@/core/recommendation";
import { getLanguageModule } from "@/languages/registry";
import type { Database } from "../db/client";
import { listCourses, type CourseWithLessons, type LessonSummary } from "../repositories/content";
import {
  getDueReviews,
  getLearnerProgress,
  getRecentAttempts,
  progressKey,
  type ItemProgress,
} from "../repositories/progress";
import type { Learner } from "../repositories/learners";

const ESTABLISHED_OR_PRACTICING: ReadonlySet<MasteryState> = new Set([
  "practicing",
  "proficient",
  "mastered",
]);

export interface LessonStatus {
  lesson: LessonSummary;
  /** Items with any evidence, on any skill. */
  started: number;
  /** Per skill: items at practicing or better. */
  practicedBySkill: Record<string, number>;
}

export interface LearningOverview {
  skills: readonly SkillDefinition[];
  courses: CourseWithLessons[];
  lessonStatus: Map<string, LessonStatus>;
  progress: Map<string, ItemProgress>;
  currentLesson: LessonSummary | null;
  dueBySkill: Record<string, number>;
  distributionBySkill: Record<string, MasteryDistribution>;
  recommendations: Recommendation[];
  last7Days: { attempts: number; accuracy: number | null };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function stateFor(progress: Map<string, ItemProgress>, itemId: string, skill: string): MasteryState {
  return progress.get(progressKey(itemId, skill))?.state ?? "not_started";
}

export async function getLearningOverview(
  db: Database,
  learner: Learner,
  now = new Date(),
): Promise<LearningOverview> {
  const languageModule = getLanguageModule(learner.targetLanguage);
  const skills = languageModule.skills;
  const [courses, progress, due, recent] = await Promise.all([
    listCourses(db, learner.targetLanguage),
    getLearnerProgress(db, learner.id, now),
    getDueReviews(db, learner.id, now),
    getRecentAttempts(db, learner.id, { since: new Date(now.getTime() - 7 * DAY_MS), limit: 10_000 }),
  ]);

  const allLessons = courses.flatMap((c) => c.lessons);
  const allItemIds = [...new Set(allLessons.flatMap((l) => l.itemIds))];

  const lessonStatus = new Map<string, LessonStatus>();
  for (const lesson of allLessons) {
    const practicedBySkill: Record<string, number> = {};
    let started = 0;
    for (const itemId of lesson.itemIds) {
      if (skills.some((s) => progress.has(progressKey(itemId, s.id)))) started++;
      for (const s of skills) {
        if (ESTABLISHED_OR_PRACTICING.has(stateFor(progress, itemId, s.id))) {
          practicedBySkill[s.id] = (practicedBySkill[s.id] ?? 0) + 1;
        }
      }
    }
    lessonStatus.set(lesson.id, { lesson, started, practicedBySkill });
  }

  // The current lesson is the first one containing items the learner has not yet tried.
  const nextLesson =
    allLessons.find((l) => (lessonStatus.get(l.id)?.started ?? 0) < l.itemIds.length) ?? null;

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

  // Weak = the most recent attempt was wrong, or retention has lapsed.
  const weakItems = [...progress.values()]
    .filter(
      (p) => p.state === "needs_review" || (p.mastery.attempts > 0 && p.mastery.consecutiveCorrect === 0),
    )
    .filter((p) => !due.some((d) => d.contentItemId === p.contentItemId && d.skill === p.skill))
    .map((p) => ({
      contentItemId: p.contentItemId,
      skill: p.skill,
      state: p.state === "needs_review" ? p.state : ("learning" as const),
    }));

  const recommendations = recommendNext({
    dueReviews: Object.entries(dueBySkill).map(([skill, count]) => ({ skill, count })),
    weakItems,
    nextLesson,
  });

  return {
    skills,
    courses,
    lessonStatus,
    progress,
    currentLesson: nextLesson ?? allLessons.at(-1) ?? null,
    dueBySkill,
    distributionBySkill,
    recommendations,
    last7Days: { attempts: recent.length, accuracy: attemptAccuracy(recent) },
  };
}
