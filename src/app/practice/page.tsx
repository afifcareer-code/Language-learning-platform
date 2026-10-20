import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { practiceHref } from "@/features/practice/routes";
import { getLanguageModule } from "@/languages/registry";
import { getContext } from "@/server/context";
import { getLearningOverview } from "@/server/services/overview";

export const metadata: Metadata = { title: "Practice" };

export default async function PracticePage() {
  const { db, learner } = await getContext();
  const overview = await getLearningOverview(db, learner);
  const skills = getLanguageModule(learner.targetLanguage).skills;
  const lesson = overview.currentLesson;

  return (
    <>
      <PageHeader
        title="Practice"
        description={
          lesson
            ? `Practising items from ${lesson.title}. Choose a lesson in Learn to practise something else.`
            : undefined
        }
      />
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {skills.map((skill) => (
          <Card key={skill.id} className="flex flex-col">
            <h2 className="text-xl font-semibold">{skill.label}</h2>
            <p className="mt-1 flex-1 text-muted">{skill.description}</p>
            <ButtonLink href={practiceHref(skill.id, { lesson: lesson?.slug })} className="mt-6">
              Start
            </ButtonLink>
          </Card>
        ))}
      </div>
    </>
  );
}
