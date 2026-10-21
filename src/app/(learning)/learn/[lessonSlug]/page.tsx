import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityCard } from "@/components/learning/activity-card";
import { ProgressRing } from "@/components/learning/progress-ring";
import { Card } from "@/components/ui/card";
import { readinessOfPairs } from "@/core/analytics";
import { ACTIVITY_GROUPS, activityGroup } from "@/core/activities";
import { JapaneseLessonContent } from "@/features/japanese/lesson-content";
import { activityHref } from "@/features/practice/routes";
import { criterionLabel, languageName, skillLabel } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getCurrentOverview, requireLearningContext } from "@/server/learning-context";
import { getContentItems, getContentTranslations } from "@/server/repositories/content";
import { locateLesson } from "@/server/repositories/curriculum";
import { stateFor } from "@/server/services/overview";
import { cn } from "@/shared/cn";

type Props = { params: Promise<{ lessonSlug: string }> };

const DONE = ["completed", "outcome_achieved"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).lessonSlug;
  const overview = await getCurrentOverview();
  return { title: overview.curriculum.lessons.find((l) => l.slug === slug)?.title };
}

/**
 * A lesson: where it sits, the situation and objective, what you will be able
 * to do, then Learn → Practice → Apply → Check.
 */
export default async function LessonPage({ params }: Props) {
  const { lessonSlug } = await params;
  const { db } = await getContext();
  const { locale, t } = await getI18n();
  const context = await requireLearningContext();
  const overview = await getCurrentOverview();
  const found = overview.curriculum.lessons.find((l) => l.slug === lessonSlug);
  const where = found && locateLesson(overview.curriculum, found.id);
  if (!where) notFound();
  const { lesson, course, level } = where;

  const [items, translations] = await Promise.all([
    getContentItems(db, lesson.itemIds),
    getContentTranslations(db, lesson.itemIds, locale),
  ]);
  const statusOf = (id: string) => overview.activityStatus.get(id) ?? "not_started";
  const firstOpen = lesson.activities.find((a) => !DONE.includes(statusOf(a.id)));
  const readiness = readinessOfPairs(
    lesson.activities.flatMap((a) => a.contentItemIds.map((itemId) => ({ itemId, skill: a.skill }))),
    (id, skill) => stateFor(overview.progress, id, skill),
  );
  const levelCode = level.frameworkLevel ?? level.title;
  const levelHref = level.id === context.level.id ? "/learn" : `/learn?level=${level.slug}`;

  return (
    <>
      <nav aria-label={t("learning.lesson.breadcrumb")} className="mb-3 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/learn" className="hover:text-ink">
              {languageName(t, context.language.code)}
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={levelHref} className="hover:text-ink">
              {levelCode}
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>{course.title}</li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="font-medium text-ink">
            {t("learning.lessonNumber", { n: where.number })}
          </li>
        </ol>
      </nav>

      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{lesson.title}</h1>
        <dl className="mt-4 grid max-w-3xl gap-4 md:grid-cols-2">
          {lesson.situation && (
            <div>
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                {t("learning.lesson.situation")}
              </dt>
              <dd className="mt-1">{lesson.situation}</dd>
            </div>
          )}
          {lesson.objective && (
            <div>
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                {t("learning.lesson.objective")}
              </dt>
              <dd className="mt-1 font-medium">{lesson.objective}</dd>
            </div>
          )}
        </dl>
      </header>

      <Card className="mb-8">
        <h2 className="text-lg font-semibold">{t("learning.lesson.outcomes")}</h2>
        <p className="mt-1 text-sm text-muted">{t("learning.lesson.outcomesHint")}</p>
        <ul className="mt-4 grid gap-3">
          {lesson.activities.map((a) => {
            const done = DONE.includes(statusOf(a.id));
            return (
              <li key={a.id} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    done ? "border-success bg-success-soft text-success" : "border-line text-muted",
                  )}
                >
                  {done ? "✓" : ""}
                </span>
                <span>
                  <span className="block">{a.text.objective}</span>
                  <span className="text-sm text-muted">
                    {skillLabel(t, a.skill)} · {t(`common.activityStatus.${statusOf(a.id)}`)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <section aria-labelledby="group-learn" className="mb-10">
        <GroupHeading
          id="group-learn"
          step={1}
          title={t("learning.lesson.groups.learn.title")}
          description={t("learning.lesson.groups.learn.description")}
        />
        <JapaneseLessonContent
          items={items}
          translations={translations}
          labels={{
            characters: t("learning.characters"),
            vocabulary: t("learning.lesson.vocabulary"),
            grammar: t("learning.lesson.grammar"),
            examples: t("learning.lesson.examples"),
            commonErrors: t("learning.lesson.commonErrors"),
            romajiNote: t("learning.lesson.romajiNote"),
          }}
        />
      </section>

      {ACTIVITY_GROUPS.map((group, g) => {
        const activities = lesson.activities.filter((a) => activityGroup(a.type) === group);
        if (!activities.length) return null;
        return (
          <section key={group} aria-labelledby={`group-${group}`} className="mb-10">
            <GroupHeading
              id={`group-${group}`}
              step={g + 2}
              title={t(`learning.lesson.groups.${group}.title`)}
              description={t(`learning.lesson.groups.${group}.description`)}
            />
            <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activities.map((activity) => {
                const status = statusOf(activity.id);
                return (
                  <li key={activity.id}>
                    <ActivityCard
                      step={lesson.activities.indexOf(activity) + 1}
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
        );
      })}

      <section aria-labelledby="group-check">
        <GroupHeading
          id="group-check"
          step={ACTIVITY_GROUPS.length + 2}
          title={t("learning.lesson.groups.check.title")}
          description={t("learning.lesson.groups.check.description", {
            threshold: t.percent(readiness.threshold),
          })}
        />
        <Card className="flex items-center gap-4">
          <ProgressRing ratio={readiness.ratio} label={t.percent(readiness.ratio)} tone="warning" />
          <div>
            <p className="font-medium">{t("dashboard.metrics.readiness")}</p>
            <p className="text-sm text-muted">
              {t("learning.lesson.readiness", { ready: readiness.ready, total: readiness.total })}
            </p>
          </div>
        </Card>
      </section>
    </>
  );
}

function GroupHeading({
  id,
  step,
  title,
  description,
}: {
  id: string;
  step: number;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-4 flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
      >
        {step}
      </span>
      <div>
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </header>
  );
}
