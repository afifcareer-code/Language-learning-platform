import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProficiencyOverview } from "@/features/proficiency/proficiency-parts";
import { frameworkName } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { requireLearningContext } from "@/server/learning-context";
import { getProficiency } from "@/server/services/proficiency";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("proficiency.title") };
}

type Props = { searchParams: Promise<{ level?: string }> };

/** Proficiency of one level: skills, evidence, readiness and the mock assessment. Defaults to N5. */
export default async function ProficiencyPage({ searchParams }: Props) {
  const { t, locale } = await getI18n();
  const context = await requireLearningContext();
  const { db, learner } = await getContext();
  const requested = (await searchParams).level ?? "n5";
  const view = await getProficiency(db, learner, locale, requested);
  if (!view) notFound();

  const framework = frameworkName(t, context.language.proficiencyFramework);
  return (
    <>
      <PageHeader
        title={t("proficiency.levelTitle", { framework: view.level.frameworkLevel ?? view.level.title })}
        description={t("proficiency.description")}
      />
      <ProficiencyOverview
        view={view}
        t={t}
        frameworkLabel={framework}
        prerequisiteLabel={view.prerequisite.title}
      />
    </>
  );
}
