import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "@/localization/server";
import { getContext } from "./context";
import { getLearningContext, type LearningContext } from "./services/learning-context";

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
