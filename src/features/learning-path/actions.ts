"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getLocale } from "@/localization/server";
import { getContext } from "@/server/context";
import { startLearning } from "@/server/services/learning-context";

/** Move to another level of the current learning language, then show the learning path. */
export async function switchLevel(formData: FormData): Promise<void> {
  const level = z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .parse(formData.get("level"));
  const { db, learner } = await getContext();
  await startLearning(db, learner, learner.targetLanguage, level, await getLocale());
  redirect("/learn");
}
