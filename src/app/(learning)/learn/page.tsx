import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { requireLearningContext } from "@/server/learning-context";
import { getLearningOverview } from "@/server/services/overview";
import { cn } from "@/shared/cn";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("learning.title") };
}

export default async function LearnPage() {
  const { db, learner } = await getContext();
  const { locale, t } = await getI18n();
  const context = await requireLearningContext();
  const overview = await getLearningOverview(db, learner, locale, undefined, context.level.id);
  const withContent = overview.curriculum.levels.filter((l) => l.courses.some((c) => c.lessons.length));
  const inDevelopment = overview.curriculum.levels.filter((l) => !withContent.includes(l));
  const done = (id: string) =>
    ["completed", "outcome_achieved"].includes(overview.activityStatus.get(id) ?? "");

  return (
    <>
      <PageHeader title={t("learning.title")} description={t("learning.description")} />
      {overview.curriculum.levels.length === 0 && <EmptyState title={t("learning.noCourses")} />}
      {withContent.map((level) => (
        <section key={level.id} className="mb-10">
          {level.title && (
            <header className="mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{level.title}</h2>
                {level.id === context.level.id && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                    {t("learning.currentLevel")}
                  </span>
                )}
              </div>
              {level.description && <p className="mt-1 text-muted">{level.description}</p>}
            </header>
          )}
          {level.courses.map((course) => (
            <div key={course.id} className="mb-8">
              <h3 className="text-lg font-semibold">{course.title}</h3>
              {course.description && <p className="mt-1 mb-4 text-muted">{course.description}</p>}
              <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {course.lessons.map((lesson, i) => {
                  const isCurrent = overview.currentLesson?.id === lesson.id;
                  const completed = lesson.activities.filter((a) => done(a.id)).length;
                  return (
                    <li key={lesson.id}>
                      <Link href={`/learn/${lesson.slug}`} className="block h-full">
                        <Card className={cn("h-full", isCurrent ? "border-accent" : "hover:bg-sunken")}>
                          <p className="text-sm text-muted">
                            {t("learning.lessonNumber", { n: i + 1 })}
                            {isCurrent && (
                              <span className="ml-2 font-medium text-accent">{t("learning.current")}</span>
                            )}
                          </p>
                          <p className="mt-1 text-lg font-semibold">{lesson.title}</p>
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
      ))}
      {inDevelopment.length > 0 && (
        <section aria-label={t("learning.inDevelopment")}>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {inDevelopment.map((level) => (
              <li key={level.id} className="rounded-2xl border border-dashed border-line p-5 text-muted">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl font-semibold text-ink">
                    {level.frameworkLevel ?? level.title}
                  </span>
                  <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-medium">
                    {t("learning.inDevelopment")}
                  </span>
                </div>
                {level.description && <p className="mt-2 text-sm">{level.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
