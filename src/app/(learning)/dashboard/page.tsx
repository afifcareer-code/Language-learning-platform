import Link from "next/link";
import type { Recommendation } from "@/core/recommendation";
import { LearningProgress } from "@/components/learning/learning-progress";
import { MasteryCard } from "@/components/learning/mastery-card";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { itemDisplay } from "@/features/japanese/practice-items";
import { PracticeSummary } from "@/features/practice/skill-gym";
import { getPracticeOverview } from "@/server/services/practice-skills";
import { activityHref, confusionHref, reviewHref, weakItemsHref } from "@/features/practice/routes";
import { languageName, masteryLabels, skillDescription, skillLabel } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getCurrentOverview, requireLearningContext } from "@/server/learning-context";
import { getContentItems } from "@/server/repositories/content";
import { locateLesson } from "@/server/repositories/curriculum";

export default async function DashboardPage() {
  const { db, learner } = await getContext();
  const { t } = await getI18n();
  const context = await requireLearningContext();
  const overview = await getCurrentOverview();
  const gym = await getPracticeOverview(db, learner);
  const next = overview.nextActivity;
  const nextLesson = overview.currentLesson;
  const here = nextLesson && locateLesson(overview.curriculum, nextLesson.id);
  const youAreHere = [
    languageName(t, context.language.code),
    context.level.frameworkLevel ?? context.level.title,
    ...(here ? [t("learning.lessonNumber", { n: here.number }), here.lesson.title] : []),
  ].join(" · ");

  const pairIds = overview.recommendations.flatMap((r) => (r.kind === "confusion" ? [r.itemA, r.itemB] : []));
  const pairItems = Object.fromEntries(
    (await getContentItems(db, pairIds)).map((i) => [i.id, itemDisplay(i)]),
  );

  const describe = (rec: Recommendation): { title: string; reason: string; href: string } => {
    switch (rec.kind) {
      case "review":
        return {
          title: t("dashboard.recommendations.review", { count: rec.count, skill: skillLabel(t, rec.skill) }),
          reason: t("dashboard.recommendations.reasons.due_for_review"),
          href: reviewHref(rec.skill),
        };
      case "practice":
        return {
          title: t("dashboard.recommendations.practice", {
            count: rec.contentItemIds.length,
            skill: skillLabel(t, rec.skill),
          }),
          reason: t("dashboard.recommendations.reasons.recent_mistakes"),
          href: weakItemsHref(rec.skill),
        };
      case "confusion":
        return {
          title: t("dashboard.recommendations.confusion", {
            a: pairItems[rec.itemA] ?? "",
            b: pairItems[rec.itemB] ?? "",
          }),
          reason: t("dashboard.recommendations.reasons.confused_pair", { count: rec.errorCount }),
          href: confusionHref(rec.itemA, rec.itemB),
        };
      case "activity":
        return {
          title:
            overview.curriculum.activities.find((a) => a.id === rec.activity.id)?.text.title ??
            rec.activity.id,
          reason: t("dashboard.recommendations.reasons.next_in_curriculum"),
          href: activityHref(rec.activity.id),
        };
    }
  };

  const readiness = overview.readiness;
  const labels = masteryLabels(t);

  return (
    <>
      <PageHeader
        title={t("dashboard.title", { name: learner.displayName })}
        description={`${t("dashboard.youAreHere")}: ${youAreHere}`}
        actions={
          <Link href="/learn" className="inline-flex min-h-11 items-center text-sm font-medium text-accent">
            {t("dashboard.viewPath")}
          </Link>
        }
      />

      <div className="grid gap-4 md:gap-6">
        <LearningProgress
          explainer={t("dashboard.metrics.explainer")}
          metrics={[
            {
              title: t("dashboard.metrics.courseProgress"),
              ratio: overview.courseProgress.ratio,
              value: t.percent(overview.courseProgress.ratio),
              detail: t("dashboard.metrics.courseProgressDetail", {
                completed: overview.courseProgress.completedActivities,
                total: overview.courseProgress.totalActivities,
              }),
            },
            {
              title: t("dashboard.metrics.skillMastery"),
              ratio: overview.overallMastery.ratio,
              value: t.percent(overview.overallMastery.ratio),
              tone: "success",
              detail: t("dashboard.metrics.skillMasteryDetail", {
                demonstrated: overview.overallMastery.demonstrated,
                total: overview.overallMastery.total,
              }),
            },
            {
              title: t("dashboard.metrics.readiness"),
              ratio: readiness?.ratio ?? 0,
              value: t.percent(readiness?.ratio ?? 0),
              tone: "warning",
              detail: readiness
                ? readiness.isReady
                  ? t("dashboard.metrics.readinessReady", { lesson: readiness.lesson.title })
                  : t("dashboard.metrics.readinessNotReady", {
                      lesson: readiness.lesson.title,
                      ready: readiness.ready,
                      total: readiness.total,
                      threshold: t.percent(readiness.threshold),
                    })
                : "—",
            },
          ]}
        />

        {gym.length > 0 && <PracticeSummary overview={gym} t={t} />}

        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">
              {t("dashboard.todaysFocus")}
            </p>
            <CardTitle className="mt-1">{t("dashboard.continue.title")}</CardTitle>
            {next ? (
              <div className="mt-4">
                <p className="text-sm text-muted">
                  {nextLesson?.title} · {t(`common.activityTypes.${next.type}`)}
                </p>
                <p className="mt-1 text-xl font-semibold">{next.text.title}</p>
                <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">
                  {t("dashboard.continue.objective")}
                </p>
                <p className="mt-1">{next.text.objective}</p>
                <ButtonLink href={activityHref(next.id)} className="mt-5">
                  {t("common.actions.continue")}
                </ButtonLink>
              </div>
            ) : (
              <p className="mt-4 text-muted">{t("dashboard.continue.noContent")}</p>
            )}
          </Card>

          <Card>
            <CardTitle>{t("dashboard.week.title")}</CardTitle>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted">{t("dashboard.week.attempts")}</dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {t.number(overview.last7Days.attempts)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t("dashboard.week.accuracy")}</dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {overview.last7Days.accuracy === null ? "—" : t.percent(overview.last7Days.accuracy)}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card>
          <CardTitle>{t("dashboard.recommendations.title")}</CardTitle>
          {overview.recommendations.length ? (
            <ul className="-mx-3 mt-3 divide-y divide-line">
              {overview.recommendations.map((rec, i) => {
                const { title, reason, href } = describe(rec);
                return (
                  <li key={i}>
                    <Link
                      href={href}
                      className="flex min-h-14 items-center justify-between gap-4 rounded-xl px-3 py-2 hover:bg-sunken"
                    >
                      <span>
                        <span className="block font-medium">{title}</span>
                        <span className="text-sm text-muted">{reason}</span>
                      </span>
                      <span aria-hidden="true" className="text-muted">
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-muted">{t("dashboard.recommendations.allCaughtUp")}</p>
          )}
        </Card>

        <section>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-muted uppercase">
            {t("dashboard.masteryBySkill")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {overview.skills.map((skill) => (
              <MasteryCard
                key={skill.id}
                title={skillLabel(t, skill.id)}
                description={skillDescription(t, skill.id)}
                distribution={overview.distributionBySkill[skill.id]!}
                labels={labels}
                href="/progress"
                linkLabel={t("common.actions.details")}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
