import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActivityCard } from "@/components/learning/activity-card";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { KanaGrid } from "@/features/kana/kana-grid";
import { toKanaViews } from "@/features/kana/kana-view";
import { activityHref } from "@/features/practice/routes";
import { criterionLabel, masteryLabels, skillLabel } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getContentItems } from "@/server/repositories/content";
import { getLearningOverview } from "@/server/services/overview";

type Props = { params: Promise<{ lessonSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { db, learner } = await getContext();
  const { locale } = await getI18n();
  const slug = (await params).lessonSlug;
  const overview = await getLearningOverview(db, learner, locale);
  return { title: overview.curriculum.lessons.find((l) => l.slug === slug)?.title };
}

export default async function LessonPage({ params }: Props) {
  const { lessonSlug } = await params;
  const { db, learner } = await getContext();
  const { locale, t } = await getI18n();
  const overview = await getLearningOverview(db, learner, locale);
  const lesson = overview.curriculum.lessons.find((l) => l.slug === lessonSlug);
  if (!lesson) notFound();

  const kana = toKanaViews(await getContentItems(db, lesson.itemIds));
  const firstOpen = lesson.activities.find(
    (a) => !["completed", "outcome_achieved"].includes(overview.activityStatus.get(a.id) ?? ""),
  );

  return (
    <>
      <PageHeader title={lesson.title} description={t("learning.description")} />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="self-start">
          <CardTitle className="mb-4">{t("learning.characters")}</CardTitle>
          <KanaGrid items={kana} labels={masteryLabels(t)} />
        </Card>
        <section>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-muted uppercase">
            {t("learning.activities")}
          </h2>
          <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lesson.activities.map((activity, i) => {
              const status = overview.activityStatus.get(activity.id) ?? "not_started";
              return (
                <li key={activity.id}>
                  <ActivityCard
                    step={i + 1}
                    typeLabel={`${t(`common.activityTypes.${activity.type}`)} · ${skillLabel(t, activity.skill)}`}
                    title={activity.text.title}
                    objective={activity.text.objective}
                    status={status}
                    statusLabel={t(`common.activityStatus.${status}`)}
                    criteria={[
                      ...activity.successCriteria.map((c) => criterionLabel(t, c)),
                      t("learning.targetMastery", { state: t(`common.mastery.${activity.targetMastery}`) }),
                    ]}
                    labels={{
                      objective: t("learning.objective"),
                      criteria: t("learning.successCriteria"),
                      start: t("learning.startActivity"),
                    }}
                    href={activityHref(activity.id)}
                    highlighted={activity.id === firstOpen?.id}
                  />
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}
