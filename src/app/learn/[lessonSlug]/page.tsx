import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { KanaGrid } from "@/features/kana/kana-grid";
import { toKanaViews } from "@/features/kana/kana-view";
import { practiceHref } from "@/features/practice/routes";
import { getContext } from "@/server/context";
import { getContentItems, getLessonBySlug } from "@/server/repositories/content";
import { getLearnerProgress, progressKey } from "@/server/repositories/progress";
import { getLanguageModule } from "@/languages/registry";

type Props = { params: Promise<{ lessonSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { db } = await getContext();
  const lesson = await getLessonBySlug(db, (await params).lessonSlug);
  return { title: lesson?.title ?? "Lesson" };
}

export default async function LessonPage({ params }: Props) {
  const { lessonSlug } = await params;
  const { db, learner } = await getContext();
  const lesson = await getLessonBySlug(db, lessonSlug);
  if (!lesson) notFound();

  const [items, progress] = await Promise.all([
    getContentItems(db, lesson.itemIds),
    getLearnerProgress(db, learner.id),
  ]);
  const kana = toKanaViews(items);
  const skills = getLanguageModule(learner.targetLanguage).skills;

  return (
    <>
      <PageHeader
        title={lesson.title}
        description="Study the characters below, then practise reading and writing them."
      />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <KanaGrid items={kana} />
        </Card>
        <div className="flex flex-col gap-4">
          {skills.map((skill) => {
            const states = Object.fromEntries(
              kana.map((k) => [k.id, progress.get(progressKey(k.id, skill.id))?.state ?? "not_started"]),
            );
            const practised = Object.values(states).filter((s) => s !== "not_started").length;
            return (
              <Card key={skill.id}>
                <CardTitle>{skill.label}</CardTitle>
                <p className="mt-2 text-sm text-muted">{skill.description}</p>
                <p className="mt-2 text-sm">
                  {practised} of {kana.length} attempted
                </p>
                <ButtonLink href={practiceHref(skill.id, { lesson: lesson.slug })} className="mt-4 w-full">
                  Practise {skill.label.toLowerCase()}
                </ButtonLink>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
