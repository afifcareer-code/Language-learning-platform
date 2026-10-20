"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LOCALES } from "@/localization/config";
import { getContext } from "@/server/context";

const settingsSchema = z.object({
  uiLocale: z.enum(LOCALES),
  displayName: z.string().trim().min(1).max(80),
});

export async function saveSettings(formData: FormData): Promise<void> {
  const data = settingsSchema.parse({
    uiLocale: formData.get("uiLocale"),
    displayName: formData.get("displayName"),
  });
  const { db, learner } = await getContext();
  await db.update(db.t.learners).set(data).where(eq(db.t.learners.id, learner.id));
  revalidatePath("/", "layout");
}
