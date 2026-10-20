import { redirect } from "next/navigation";
import { LanguageSelection } from "@/features/onboarding/language-selection";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getCurrentLearningContext } from "@/server/learning-context";
import { listLanguages } from "@/server/services/learning-context";

/**
 * Entry point. Learners who already have a learning language go straight to
 * their dashboard; everyone else is asked what they want to learn.
 */
export default async function EntryPage() {
  if (await getCurrentLearningContext()) redirect("/dashboard");
  const { db } = await getContext();
  const { t } = await getI18n();
  return <LanguageSelection t={t} languages={await listLanguages(db)} started={{}} current={null} />;
}
