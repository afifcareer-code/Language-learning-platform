import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { toKanaViews } from "@/features/kana/kana-view";
import { practiceHref } from "@/features/practice/routes";
import { getLanguageModule } from "@/languages/registry";
import { getContext } from "@/server/context";
import { getContentItems } from "@/server/repositories/content";
import { getDueReviews } from "@/server/repositories/progress";
import { pluralize } from "@/shared/format";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  const { db, learner } = await getContext();
  const due = await getDueReviews(db, learner.id);
  const items = await getContentItems(db, [...new Set(due.map((d) => d.contentItemId))]);
  const kanaById = new Map(toKanaViews(items).map((k) => [k.id, k]));
  const skills = getLanguageModule(learner.targetLanguage).skills;

  return (
    <>
      <PageHeader
        title="Review"
        description="Items come back for review just before you are likely to forget them. Reviewing on time is what moves them toward mastery."
      />
      {due.length === 0 ? (
        <EmptyState title="Nothing due right now">
          Practise new items and they will be scheduled here.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {skills.map((skill) => {
            const forSkill = due.filter((d) => d.skill === skill.id);
            return (
              <Card key={skill.id} className="flex flex-col">
                <h2 className="text-xl font-semibold">{skill.label}</h2>
                <p className="mt-1 text-muted">{pluralize(forSkill.length, "item")} due</p>
                <p lang="ja" className="mt-4 flex-1 font-jp text-2xl tracking-widest break-all">
                  {forSkill.map((d) => kanaById.get(d.contentItemId)?.kana).join(" ")}
                </p>
                {forSkill.length > 0 && (
                  <ButtonLink href={practiceHref(skill.id, { mode: "review" })} className="mt-6">
                    Start review
                  </ButtonLink>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
