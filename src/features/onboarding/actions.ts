"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getLocale } from "@/localization/server";
import { getContext } from "@/server/context";
import { resumeLanguage, startLearning } from "@/server/services/learning-context";

const code = z.string().regex(/^[a-z]{2,3}$/);
const slug = z.string().regex(/^[a-z0-9-]+$/);

/** Start learning a language at a level, then open its dashboard. */
export async function chooseLevel(formData: FormData): Promise<void> {
  const data = z.object({ language: code, level: slug }).parse({
    language: formData.get("language"),
    level: formData.get("level"),
  });
  const { db, learner } = await getContext();
  await startLearning(db, learner, data.language, data.level, await getLocale());
  redirect("/dashboard");
}

/** Switch back to a language the learner has already started. */
export async function continueLanguage(formData: FormData): Promise<void> {
  const language = code.parse(formData.get("language"));
  const { db, learner } = await getContext();
  if (!(await resumeLanguage(db, learner, language))) redirect(`/languages/${language}`);
  redirect("/dashboard");
}
