import { buildChoices, type ActivityType } from "@/core/activities";
import type { AttemptMode, ContentItem, SkillId } from "@/core/learning";
import { getLanguageModule } from "@/languages/registry";
import type { Locale } from "@/localization/config";
import { shuffle } from "@/shared/format";
import type { Database } from "../db/client";
import { getContentItems } from "../repositories/content";
import { getCurriculum, type ActivityView } from "../repositories/curriculum";
import type { Learner } from "../repositories/learners";
import { getConfusionPairs, getDueReviews, getLearnerProgress } from "../repositories/progress";

/** What a practice session is for. Every session traces back to an objective. */
export type SessionRequest =
  | { kind: "activity"; activityId: string }
  | { kind: "review"; skill: SkillId }
  | { kind: "weak"; skill: SkillId }
  | { kind: "confusion"; itemA: string; itemB: string };

export interface PracticeSession {
  request: SessionRequest;
  type: ActivityType;
  skill: SkillId;
  mode: AttemptMode;
  /** The curriculum activity, when the session runs one. */
  activity: ActivityView | null;
  passScore: number;
  /** Prompts in order (an item may appear more than once). */
  prompts: ContentItem[];
  /** For choice activities: option item ids per prompt item. */
  choices: Record<string, string[]>;
  /** Items referenced by prompts or options. */
  items: Record<string, ContentItem>;
}

const MAX_SESSION_ITEMS = 20;
const OPTION_COUNT = 4;
const DEFAULT_PASS_SCORE = 0.8;

export async function getPracticeSession(
  db: Database,
  learner: Learner,
  locale: Locale,
  request: SessionRequest,
  now = new Date(),
): Promise<PracticeSession | null> {
  const curriculum = await getCurriculum(db, learner.targetLanguage, locale);
  const typeForSkill = (skill: SkillId): ActivityType =>
    curriculum.activities.find((a) => a.skill === skill)?.type ?? "recall";

  let activity: ActivityView | null = null;
  let skill: SkillId;
  let mode: AttemptMode = "practice";
  let promptIds: string[];

  switch (request.kind) {
    case "activity": {
      activity = curriculum.activities.find((a) => a.id === request.activityId) ?? null;
      if (!activity) return null;
      skill = activity.skill;
      promptIds = shuffle(activity.contentItemIds);
      break;
    }
    case "review": {
      skill = request.skill;
      mode = "review";
      const due = (await getDueReviews(db, learner.id, now)).filter((d) => d.skill === skill);
      promptIds = shuffle(due.slice(0, MAX_SESSION_ITEMS).map((d) => d.contentItemId));
      break;
    }
    case "weak": {
      skill = request.skill;
      const progress = await getLearnerProgress(db, learner.id, now);
      promptIds = shuffle(
        [...progress.values()]
          .filter(
            (p) => p.skill === skill && (p.state === "needs_review" || p.mastery.consecutiveCorrect === 0),
          )
          .map((p) => p.contentItemId)
          .slice(0, MAX_SESSION_ITEMS),
      );
      break;
    }
    case "confusion": {
      // Discrimination practice: recognize each item of the pair twice.
      skill = curriculum.activities.find((a) => a.type === "recognition")?.skill ?? "";
      if (!skill) return null;
      promptIds = shuffle([request.itemA, request.itemB, request.itemA, request.itemB]);
      break;
    }
  }

  const type = activity?.type ?? (request.kind === "confusion" ? "recognition" : typeForSkill(skill));
  const prompts = await getContentItems(db, promptIds);
  if (prompts.length === 0) {
    return {
      request,
      type,
      skill,
      mode,
      activity,
      passScore: activity?.passScore ?? DEFAULT_PASS_SCORE,
      prompts,
      choices: {},
      items: {},
    };
  }

  const items: Record<string, ContentItem> = Object.fromEntries(prompts.map((p) => [p.id, p]));
  const choices: Record<string, string[]> = {};
  if (type === "recognition" || type === "multiple_choice" || type === "listening") {
    const languageModule = getLanguageModule(learner.targetLanguage);
    const pool = await getContentItems(db, [...new Set(curriculum.lessons.flatMap((l) => l.itemIds))]);
    const learnerPairs = await getConfusionPairs(db, learner.id);
    for (const item of prompts) {
      if (choices[item.id]) continue;
      const comparable = pool.filter((p) => languageModule.isComparable?.(item, p) ?? p.type === item.type);
      const learnerConfusions = learnerPairs
        .filter((p) => p.status !== "resolved" && (p.itemA === item.id || p.itemB === item.id))
        .map((p) => (p.itemA === item.id ? p.itemB : p.itemA));
      const preferred = [...learnerConfusions, ...(languageModule.knownConfusables?.(item.id) ?? [])];
      choices[item.id] = buildChoices(
        item.id,
        comparable.map((p) => p.id),
        preferred,
        OPTION_COUNT,
      );
      for (const id of choices[item.id]!) items[id] ??= pool.find((p) => p.id === id)!;
    }
  }

  return {
    request,
    type,
    skill,
    mode,
    activity,
    passScore: activity?.passScore ?? DEFAULT_PASS_SCORE,
    prompts,
    choices,
    items,
  };
}
