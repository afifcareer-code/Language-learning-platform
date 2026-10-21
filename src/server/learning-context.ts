import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "@/localization/server";
import { getContext } from "./context";
import { getLearningContext, type LearningContext } from "./services/learning-context";
import { getLearningOverview, type LearningOverview } from "./services/overview";

/** The learner's current learning language and level for this request, or null before onboarding. */
export const getCurrentLearningContext = cache(async (): Promise<LearningContext | null> => {
  const { db, learner } = await getContext();
  return getLearningContext(db, learner, await getLocale());
});

/** For learning pages: the context, or a redirect to language selection. */
export async function requireLearningContext(): Promise<LearningContext> {
  const context = await getCurrentLearningContext();
  if (!context) redirect("/");
  return context;
}

/**
 * The learning overview for the current level (or `levelId`), computed once
 * per request so the shell and the page can share it.
 */
export const getCurrentOverview = cache(async (levelId?: string): Promise<LearningOverview> => {
  const context = await requireLearningContext();
  const { db, learner } = await getContext();
  return getLearningOverview(db, learner, await getLocale(), undefined, levelId ?? context.level.id);
});
