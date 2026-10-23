import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { switchLevel } from "@/features/learning-path/actions";
import { activityHref } from "@/features/practice/routes";
import { getLanguageModule } from "@/languages/registry";
import { languageName } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getCurrentOverview, requireLearningContext } from "@/server/learning-context";
import { locateLesson } from "@/server/repositories/curriculum";
import { learningPath, type LevelStatus } from "@/server/services/learning-path";
import { cn } from "@/shared/cn";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("learning.path.title") };
}

const STATUS_TONE: Record<LevelStatus, string> = {
  current: "bg-accent-soft text-accent",
  completed: "bg-success-soft text-success",
  in_progress: "bg-warning-soft text-warning",
  recommended: "bg-accent-soft text-accent",
  available: "bg-sunken text-ink",
  locked: "bg-sunken text-muted",
};

type Props = { searchParams: Promise<{ level?: string }> };

/**
 * The learning path: the current level with where the learner is, every level
 * of the framework with its status, and the lessons of the selected level.
 */
export default async function LearnPage({ searchParams }: Props) {
  const { t } = await getI18n();
  const context = await requireLearningContext();
  const current = await getCurrentOverview();
  const path = learningPath(current.curriculum, current.activityStatus, context.level.id);

  const requested = (await searchParams).level;
  const viewed =
    path.find((p) => p.level.slug === requested && p.status !== "locked") ??
    path.find((p) => p.level.id === context.level.id);
  const isCurrent = viewed?.level.id === context.level.id;
  const overview = isCurrent || !viewed ? current : await getCurrentOverview(viewed.level.id);
  const done = (id: string) =>
    ["completed", "outcome_achieved"].includes(overview.activityStatus.get(id) ?? "");

  const levelCode = (p: (typeof path)[number]) => p.level.frameworkLevel ?? p.level.title;
  const here = current.currentLesson && locateLesson(current.curriculum, current.currentLesson.id);
  const language = languageName(t, context.language.code);

  return (
    <>
      <PageHeader
        title={t("learning.path.title")}
        description={t("learning.path.description", {
          language,
          framework: (context.language.proficiencyFramework ?? "").toUpperCase(),
        })}
        actions={
          <div className="flex flex-wrap gap-x-4">
            {viewed && getLanguageModule(context.language.code).proficiencyLevel?.(viewed.level.slug) && (
              <Link
                href={`/proficiency?${new URLSearchParams({ level: viewed.level.slug })}`}
                className="inline-flex min-h-11 items-center text-sm font-medium text-accent"
              >
                {t("learning.path.viewProficiency")}
              </Link>
            )}
            <Link
              href="/languages"
              className="inline-flex min-h-11 items-center text-sm font-medium text-accent"
            >
              {t("common.shell.changeLearningLanguage")}
            </Link>
          </div>
        }
      />
      {path.length === 0 && <EmptyState title={t("learning.noCourses")} />}

      <Card className="mb-8 border-accent">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          {t("learning.path.youAreHere")}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-semibold">
              {language} · {context.level.frameworkLevel ?? context.level.title}
            </p>
            {here && (
              <p className="mt-1 text-muted">
                {here.course.title} · {t("learning.lessonNumber", { n: here.number })} · {here.lesson.title}
              </p>
            )}
          </div>
          {current.nextActivity && (
            <ButtonLink href={activityHref(current.nextActivity.id)}>
              {t("learning.path.continue")}
            </ButtonLink>
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-accent-fill"
            style={{ width: `${current.courseProgress.ratio * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          {t("learning.activitiesProgress", {
            completed: current.courseProgress.completedActivities,
            total: current.courseProgress.totalActivities,
          })}
        </p>
      </Card>

      <section aria-labelledby="levels" className="mb-10">
        <h2 id="levels" className="mb-3 text-sm font-medium tracking-wide text-muted uppercase">
          {t("learning.path.levels")}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {path.map((p) => {
            const selected = p.level.id === viewed?.level.id;
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl font-semibold text-ink">{levelCode(p)}</span>
                  <span
                    className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_TONE[p.status])}
                  >
                    {t(`learning.path.status.${p.status}`)}
                  </span>
                </div>
                {p.level.frameworkLevel && p.level.title !== p.level.frameworkLevel && (
                  <p className="mt-1 text-sm font-medium">{p.level.title}</p>
                )}
                {p.level.description && <p className="mt-2 text-sm text-muted">{p.level.description}</p>}
                {p.totalActivities > 0 && (
                  <p className="mt-3 text-sm text-muted">
                    {t("learning.activitiesProgress", {
                      completed: p.completedActivities,
                      total: p.totalActivities,
                    })}
                  </p>
                )}
              </>
            );
            return (
              <li key={p.level.id}>
                {p.status === "locked" ? (
                  <div
                    aria-disabled="true"
                    className="h-full rounded-2xl border border-dashed border-line p-5 text-muted"
                  >
                    {body}
                  </div>
                ) : (
                  <Link
                    href={p.level.id === context.level.id ? "/learn" : `/learn?level=${p.level.slug}`}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "block h-full rounded-2xl border bg-surface p-5 transition-colors hover:bg-sunken",
                      selected ? "border-accent ring-1 ring-accent" : "border-line",
                    )}
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {viewed && (
        <section aria-labelledby="lessons">
          <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="lessons" className="text-xl font-semibold">
                {t("learning.path.lessonsIn", { level: levelCode(viewed) })}
              </h2>
              {!isCurrent && (
                <p className="mt-1 text-muted">
                  {t("learning.path.viewing", {
                    level: levelCode(viewed),
                    current: context.level.frameworkLevel ?? context.level.title,
                  })}
                </p>
              )}
            </div>
            {!isCurrent && (
              <form action={switchLevel}>
                <input type="hidden" name="level" value={viewed.level.slug} />
                <Button type="submit" variant="secondary">
                  {t("learning.path.switch")}
                </Button>
              </form>
            )}
          </header>
          {viewed.level.courses.map((course) => (
            <div key={course.id} className="mb-8">
              <h3 className="text-lg font-semibold">{course.title}</h3>
              {course.description && <p className="mt-1 mb-4 text-muted">{course.description}</p>}
              <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {course.lessons.map((lesson, i) => {
                  const isCurrentLesson = overview.currentLesson?.id === lesson.id;
                  const completed = lesson.activities.filter((a) => done(a.id)).length;
                  return (
                    <li key={lesson.id}>
                      <Link href={`/learn/${lesson.slug}`} className="block h-full">
                        <Card className={cn("h-full", isCurrentLesson ? "border-accent" : "hover:bg-sunken")}>
                          <p className="text-sm text-muted">
                            {t("learning.lessonNumber", { n: i + 1 })}
                            {isCurrentLesson && (
                              <span className="ml-2 font-medium text-accent">{t("learning.current")}</span>
                            )}
                          </p>
                          <p className="mt-1 text-lg font-semibold">{lesson.title}</p>
                          {lesson.objective && <p className="mt-1 text-sm text-muted">{lesson.objective}</p>}
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
                            <div
                              className="h-full rounded-full bg-accent-fill"
                              style={{
                                width: `${(completed / Math.max(1, lesson.activities.length)) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="mt-2 text-sm text-muted">
                            {t("learning.activitiesProgress", { completed, total: lesson.activities.length })}
                          </p>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
