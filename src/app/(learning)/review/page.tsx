import type { Metadata } from "next";
import { ReviewCard } from "@/components/learning/review-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { itemDisplay } from "@/features/kana/kana-view";
import { reviewHref } from "@/features/practice/routes";
import { getLanguageModule } from "@/languages/registry";
import { skillLabel } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getContentItems } from "@/server/repositories/content";
import { getDueReviews } from "@/server/repositories/progress";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("review.title") };
}

export default async function ReviewPage() {
  const { db, learner } = await getContext();
  const { t } = await getI18n();
  const due = await getDueReviews(db, learner.id);
  const items = await getContentItems(db, [...new Set(due.map((d) => d.contentItemId))]);
  const display = new Map(items.map((i) => [i.id, itemDisplay(i)]));
  const skills = getLanguageModule(learner.targetLanguage).skills;

  return (
    <>
      <PageHeader title={t("review.title")} description={t("review.description")} />
      {due.length === 0 ? (
        <EmptyState title={t("review.nothingDue")}>{t("review.nothingDueHint")}</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {skills.map((skill) => {
            const forSkill = due.filter((d) => d.skill === skill.id);
            return (
              <ReviewCard
                key={skill.id}
                title={skillLabel(t, skill.id)}
                countLabel={t("review.due", { count: forSkill.length })}
                preview={forSkill.map((d) => display.get(d.contentItemId) ?? "")}
                previewLang={learner.targetLanguage}
                href={forSkill.length ? reviewHref(skill.id) : undefined}
                startLabel={t("review.start")}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
