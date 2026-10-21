import type { ReactNode } from "react";
import Link from "next/link";
import { BottomNav, MobileSettingsLink, SettingsNavLink, SideNav } from "@/components/app-nav";
import { LogoMark } from "@/components/logo";
import { LearningContextChip } from "@/features/shell/learning-context-chip";
import { UiLocaleSwitcher } from "@/features/shell/ui-locale-switcher";
import { languageName } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getCurrentOverview, requireLearningContext } from "@/server/learning-context";
import { locateLesson } from "@/server/repositories/curriculum";

/**
 * Shell for learning pages. Requires a learning language and level; learners
 * without one are sent to language selection.
 */
export default async function LearningLayout({ children }: { children: ReactNode }) {
  const context = await requireLearningContext();
  const { t } = await getI18n();
  const overview = await getCurrentOverview();
  const here = overview.currentLesson && locateLesson(overview.curriculum, overview.currentLesson.id);
  const chip = {
    languageCode: context.language.code,
    nativeName: context.language.nativeName,
    languageLabel: languageName(t, context.language.code),
    levelLabel: context.level.frameworkLevel ?? context.level.title,
    lessonLabel: here
      ? `${t("learning.lessonNumber", { n: here.number })} · ${here.lesson.title}`
      : undefined,
    srLabel: t("common.shell.learningPath"),
  };

  return (
    <>
      <div className="md:flex">
        <aside className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col gap-6 border-r border-line bg-surface px-3 py-6 md:flex xl:w-64">
          <Link href="/dashboard" className="flex items-center justify-center gap-3 xl:justify-start xl:px-3">
            <LogoMark />
            <span className="hidden text-sm leading-tight font-semibold xl:block">{t("common.appName")}</span>
            <span className="sr-only xl:hidden">{t("common.appName")}</span>
          </Link>
          <SideNav />
          <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
            <LearningContextChip
              {...chip}
              compact
              className="flex-col justify-center gap-1 px-2 xl:flex-row xl:justify-start xl:gap-3 xl:px-3"
            />
            <UiLocaleSwitcher compact="below-xl" placement="up" />
            <SettingsNavLink />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 px-4 pt-3 md:hidden">
            <Link href="/dashboard" aria-label={t("common.appName")}>
              <LogoMark />
            </Link>
            <LearningContextChip {...chip} className="min-h-11 min-w-0 flex-1 py-1" />
            <UiLocaleSwitcher compact="always" />
            <MobileSettingsLink />
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-28 md:px-8 md:pt-10 md:pb-12">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
