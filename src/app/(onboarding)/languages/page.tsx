import type { Metadata } from "next";
import { LanguageSelection } from "@/features/onboarding/language-selection";
import { getI18n, getLocale } from "@/localization/server";
import { getContext } from "@/server/context";
import { getCurrentLearningContext } from "@/server/learning-context";
import { listLanguages, listLearnerLanguages, listLevels } from "@/server/services/learning-context";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("onboarding.switchTitle") };
}

/** The learning-language switcher: languages in progress, available and planned. */
export default async function LanguagesPage() {
  const { db, learner } = await getContext();
  const { t } = await getI18n();
  const locale = await getLocale();
  const [languages, started, current] = await Promise.all([
    listLanguages(db),
    listLearnerLanguages(db, learner.id),
    getCurrentLearningContext(),
  ]);
  const levelTitles: Record<string, string> = {};
  for (const row of started) {
    const level = (await listLevels(db, row.languageCode, locale)).find((l) => l.id === row.currentLevelId);
    if (level) levelTitles[row.languageCode] = level.title;
  }
  return <LanguageSelection t={t} languages={languages} started={levelTitles} current={current} />;
}
