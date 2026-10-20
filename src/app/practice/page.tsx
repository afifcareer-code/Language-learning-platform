import type { Metadata } from "next";
import Link from "next/link";
import { needsRemediation } from "@/core/analytics";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { itemDisplay } from "@/features/kana/kana-view";
import { activityHref, confusionHref, weakItemsHref } from "@/features/practice/routes";
import { skillDescription, skillLabel } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getContentItems } from "@/server/repositories/content";
import { getLearningOverview } from "@/server/services/overview";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("practice.title") };
}

export default async function PracticePage() {
  const { db, learner } = await getContext();
  const { locale, t } = await getI18n();
  const overview = await getLearningOverview(db, learner, locale);
  const lesson = overview.currentLesson;

  const weakBySkill = new Map<string, number>();
  for (const p of overview.progress.values()) {
    if (p.state === "needs_review" || (p.mastery.attempts > 0 && p.mastery.consecutiveCorrect === 0)) {
      weakBySkill.set(p.skill, (weakBySkill.get(p.skill) ?? 0) + 1);
    }
  }
  const pairs = overview.confusionPairs.filter((p) => needsRemediation(p));
  const display = Object.fromEntries(
    (
      await getContentItems(
        db,
        pairs.flatMap((p) => [p.itemA, p.itemB]),
      )
    ).map((i) => [i.id, itemDisplay(i)]),
  );

  return (
    <>
      <PageHeader
        title={t("practice.title")}
        description={lesson ? t("practice.description", { lesson: lesson.title }) : undefined}
      />

      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {lesson?.activities.map((activity) => (
          <Card key={activity.id} className="flex flex-col">
            <p className="text-sm font-medium text-muted">{t(`common.activityTypes.${activity.type}`)}</p>
            <h2 className="mt-1 text-xl font-semibold">{skillLabel(t, activity.skill)}</h2>
            <p className="mt-1 flex-1 text-muted">{skillDescription(t, activity.skill)}</p>
            <ButtonLink href={activityHref(activity.id)} className="mt-6">
              {t("common.actions.start")}
            </ButtonLink>
          </Card>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">{t("practice.focusTitle")}</h2>
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Card>
            <h3 className="font-semibold">{t("practice.weakItems")}</h3>
            {weakBySkill.size === 0 ? (
              <p className="mt-2 text-muted">{t("practice.weakItemsEmpty")}</p>
            ) : (
              <ul className="-mx-3 mt-2 divide-y divide-line">
                {[...weakBySkill].map(([skill, count]) => (
                  <li key={skill}>
                    <Link
                      href={weakItemsHref(skill)}
                      className="flex min-h-12 items-center justify-between rounded-xl px-3 hover:bg-sunken"
                    >
                      <span>{skillLabel(t, skill)}</span>
                      <span className="text-sm text-muted">{t("common.units.items", { count })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h3 className="font-semibold">{t("practice.confusionPairs")}</h3>
            {pairs.length === 0 ? (
              <p className="mt-2 text-muted">{t("progress.confusion.empty")}</p>
            ) : (
              <ul className="-mx-3 mt-2 divide-y divide-line">
                {pairs.map((p) => (
                  <li key={`${p.itemA}-${p.itemB}`}>
                    <Link
                      href={confusionHref(p.itemA, p.itemB)}
                      className="flex min-h-12 items-center justify-between rounded-xl px-3 hover:bg-sunken"
                    >
                      <span lang="ja" className="font-jp text-2xl">
                        {display[p.itemA]} ↔ {display[p.itemB]}
                      </span>
                      <span className="text-sm text-muted">
                        {t("progress.confusion.errors", { count: p.errorCount })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}
