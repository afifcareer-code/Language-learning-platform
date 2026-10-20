import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getContext } from "@/server/context";
import { getLearningOverview } from "@/server/services/overview";

export const metadata: Metadata = { title: "Learn" };

export default async function LearnPage() {
  const { db, learner } = await getContext();
  const overview = await getLearningOverview(db, learner);

  return (
    <>
      <PageHeader
        title="Learn"
        description="Work through the curriculum. Each lesson introduces a small set of items to practise."
      />
      {overview.courses.length === 0 && (
        <EmptyState title="No courses yet">Run npm run db:setup to load the curriculum.</EmptyState>
      )}
      {overview.courses.map((course) => (
        <section key={course.id} className="mb-10">
          <h2 className="text-xl font-semibold">{course.title}</h2>
          <p className="mt-1 mb-4 text-muted">{course.description}</p>
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {course.lessons.map((lesson, i) => {
              const status = overview.lessonStatus.get(lesson.id);
              const isCurrent = overview.currentLesson?.id === lesson.id;
              return (
                <li key={lesson.id}>
                  <Link href={`/learn/${lesson.slug}`} className="block h-full">
                    <Card className={isCurrent ? "h-full border-accent" : "h-full hover:bg-sunken"}>
                      <p className="text-sm text-muted">
                        Lesson {i + 1}
                        {isCurrent && <span className="ml-2 font-medium text-accent">Current</span>}
                      </p>
                      <p className="mt-1 text-lg font-semibold">{lesson.title}</p>
                      <dl className="mt-3 space-y-1 text-sm">
                        {overview.skills.map((skill) => (
                          <div key={skill.id} className="flex justify-between gap-4">
                            <dt className="text-muted">{skill.label}</dt>
                            <dd className="tabular-nums">
                              {status?.practicedBySkill[skill.id] ?? 0} / {lesson.itemIds.length} practising
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}
