import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getLearningOverview } from "@/server/services/overview";
import { cn } from "@/shared/cn";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("learning.title") };
}

export default async function LearnPage() {
  const { db, learner } = await getContext();
  const { locale, t } = await getI18n();
  const overview = await getLearningOverview(db, learner, locale);
  const done = (id: string) =>
    ["completed", "outcome_achieved"].includes(overview.activityStatus.get(id) ?? "");

  return (
    <>
      <PageHeader title={t("learning.title")} description={t("learning.description")} />
      {overview.curriculum.levels.length === 0 && <EmptyState title={t("learning.noCourses")} />}
      {overview.curriculum.levels.map((level) => (
        <section key={level.id} className="mb-10">
          {level.title && (
            <header className="mb-4">
              <h2 className="text-xl font-semibold">{level.title}</h2>
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
                              className="h-full rounded-full bg-accent"
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
    </>
  );
}
