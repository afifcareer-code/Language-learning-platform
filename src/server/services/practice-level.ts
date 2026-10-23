import { and, eq } from "drizzle-orm";
import type { ContentItem } from "@/core/learning";
import type { Database } from "../db/client";
import type { Learner } from "../repositories/learners";

/**
 * Practice follows the learner's level: content up to their current level is offered, nothing
 * above it. A learner still in the foundation (before the framework's first level) practises
 * up to that first level, which is what they are working towards.
 */
export interface PracticeLevels {
  /** Whether an item may be practised now. Items without a level always may. */
  allows: (item: ContentItem) => boolean;
  /** The framework code of an item's level (e.g. "N4"), for "opens at" labels. */
  codeOf: (item: ContentItem) => string | null;
  /** Sort order of an item's level; Infinity when it has none. */
  orderOf: (item: ContentItem) => number;
}

export async function getPracticeLevels(db: Database, learner: Learner): Promise<PracticeLevels> {
  const { levels, learnerLanguages } = db.t;
  const rows = await db.select().from(levels).where(eq(levels.languageCode, learner.targetLanguage));
  const [current] = await db
    .select()
    .from(learnerLanguages)
    .where(
      and(
        eq(learnerLanguages.learnerId, learner.id),
        eq(learnerLanguages.languageCode, learner.targetLanguage),
      ),
    )
    .limit(1);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const firstFramework = Math.min(
    ...rows.filter((r) => r.frameworkLevel !== null).map((r) => r.sortOrder),
    Number.POSITIVE_INFINITY,
  );
  const own = current ? (byId.get(current.currentLevelId)?.sortOrder ?? 0) : 0;
  const ceiling = Math.max(own, Number.isFinite(firstFramework) ? firstFramework : own);
  const orderOf = (item: ContentItem) =>
    item.levelId ? (byId.get(item.levelId)?.sortOrder ?? Number.POSITIVE_INFINITY) : -1;
  return {
    allows: (item) => orderOf(item) <= ceiling,
    codeOf: (item) => (item.levelId ? (byId.get(item.levelId)?.frameworkLevel ?? null) : null),
    orderOf,
  };
}
