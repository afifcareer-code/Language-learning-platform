import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProficiencyCard } from "@/components/learning/proficiency-card";
import { Button } from "@/components/ui/button";
import { chooseLevel } from "@/features/onboarding/actions";
import { frameworkName, languageName } from "@/localization/labels";
import { getI18n, getLocale } from "@/localization/server";
import { getContext } from "@/server/context";
import { listLanguages, listLearnerLanguages, listLevels } from "@/server/services/learning-context";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: languageName(t, (await params).code) };
}

/** "Where are you starting?": the levels of the language's proficiency framework. */
export default async function LevelSelectionPage({ params }: Props) {
  const { code } = await params;
  const { db, learner } = await getContext();
  const { t } = await getI18n();
  const language = (await listLanguages(db)).find((l) => l.code === code);
  // Planned languages have no curriculum: there is nothing to start.
  if (!language || language.status !== "available") notFound();

  const [levels, started] = await Promise.all([
    listLevels(db, code, await getLocale()),
    listLearnerLanguages(db, learner.id),
  ]);
  const currentLevelId = started.find((r) => r.languageCode === code)?.currentLevelId;
  const framework = frameworkName(t, language.proficiencyFramework);
  const first = levels.find((l) => l.hasContent);

  return (
    <div className="pt-6 md:pt-12">
      <Link href="/languages" className="text-sm font-medium text-accent">
        ← {t("onboarding.levels.back")}
      </Link>
      <p lang={code} className="mt-6 text-2xl font-semibold">
        {language.nativeName}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
        {t("onboarding.levels.title")}
      </h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">
        {t("onboarding.levels.subtitle", {
          language: languageName(t, code),
          framework,
          first: first?.title ?? "",
        })}
      </p>

      <ol className="mt-8 grid gap-3">
        {levels.map((level) => {
          const current = level.id === currentLevelId;
          return (
            <ProficiencyCard
              key={level.id}
              code={level.frameworkLevel ?? level.title}
              title={
                level.frameworkLevel
                  ? `${framework} ${level.frameworkLevel}`
                  : t("onboarding.levels.preFramework", { framework })
              }
              description={level.description}
              enabled={level.hasContent}
              current={current}
              badge={
                current
                  ? t("onboarding.levels.current")
                  : level.hasContent
                    ? undefined
                    : t("onboarding.levels.inDevelopment")
              }
              action={
                level.hasContent ? (
                  <form action={chooseLevel}>
                    <input type="hidden" name="language" value={code} />
                    <input type="hidden" name="level" value={level.slug} />
                    <Button
                      type="submit"
                      variant={
                        current || (!currentLevelId && level.id === first?.id) ? "primary" : "secondary"
                      }
                    >
                      {current ? t("onboarding.levels.continue") : t("onboarding.levels.start")}
                    </Button>
                  </form>
                ) : undefined
              }
            />
          );
        })}
      </ol>
      <p className="mt-6 text-sm text-muted">{t("onboarding.levels.onlyPublished")}</p>
    </div>
  );
}
