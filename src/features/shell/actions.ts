"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LOCALES } from "@/localization/config";
import { getContext } from "@/server/context";

/** Change the interface language. Does not affect the language being learned. */
export async function setUiLocale(locale: string): Promise<void> {
  const uiLocale = z.enum(LOCALES).parse(locale);
  const { db, learner } = await getContext();
  await db.update(db.t.learners).set({ uiLocale }).where(eq(db.t.learners.id, learner.id));
  revalidatePath("/", "layout");
}
