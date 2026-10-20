import type { AttemptMode, ContentItem, SkillId } from "@/core/learning";
import { shuffle } from "@/shared/format";
import type { Database } from "../db/client";
import { getContentItems, getLessonBySlug } from "../repositories/content";
import { getDueReviews, getLearnerProgress } from "../repositories/progress";
import type { Learner } from "../repositories/learners";
import { getLearningOverview } from "./overview";

export interface PracticeParams {
  lesson?: string;
  mode?: string;
  focus?: string;
}

export interface PracticeSet {
  title: string;
  mode: AttemptMode;
  items: ContentItem[];
}

const MAX_SESSION_ITEMS = 20;

/** Choose the items for a practice or review session. */
export async function getPracticeSet(
  db: Database,
  learner: Learner,
  skill: SkillId,
  params: PracticeParams,
  now = new Date(),
): Promise<PracticeSet> {
  if (params.mode === "review") {
    const due = (await getDueReviews(db, learner.id, now)).filter((d) => d.skill === skill);
    const items = await getContentItems(
      db,
      due.slice(0, MAX_SESSION_ITEMS).map((d) => d.contentItemId),
    );
    return { title: "Review", mode: "review", items: shuffle(items) };
  }

  if (params.focus === "weak") {
    const progress = await getLearnerProgress(db, learner.id, now);
    const ids = [...progress.values()]
      .filter((p) => p.skill === skill && (p.state === "needs_review" || p.mastery.consecutiveCorrect === 0))
      .map((p) => p.contentItemId);
    return {
      title: "Weak items",
      mode: "practice",
      items: shuffle(await getContentItems(db, ids.slice(0, MAX_SESSION_ITEMS))),
    };
  }

  const lesson = params.lesson
    ? await getLessonBySlug(db, params.lesson)
    : (await getLearningOverview(db, learner, now)).currentLesson;
  if (!lesson) return { title: "Practice", mode: "practice", items: [] };
  return { title: lesson.title, mode: "practice", items: shuffle(await getContentItems(db, lesson.itemIds)) };
}
