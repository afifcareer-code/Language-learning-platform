import Link from "next/link";
import type { Recommendation } from "@/core/recommendation";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { MasteryDistributionBar } from "@/components/ui/mastery-distribution";
import { PageHeader } from "@/components/ui/page-header";
import { getLanguageModule } from "@/languages/registry";
import { getContext } from "@/server/context";
import { getLearningOverview } from "@/server/services/overview";
import { formatPercent, pluralize } from "@/shared/format";
import { practiceHref } from "@/features/practice/routes";

function RecommendationRow({ rec, skillLabel }: { rec: Recommendation; skillLabel: string }) {
  const { title, href } =
    rec.kind === "review"
      ? {
          title: `Review ${pluralize(rec.count, "item")} · ${skillLabel}`,
          href: practiceHref(rec.skill, { mode: "review" }),
        }
      : rec.kind === "practice"
        ? {
            title: `Practise ${pluralize(rec.contentItemIds.length, "weak item")} · ${skillLabel}`,
            href: practiceHref(rec.skill, { focus: "weak" }),
          }
        : { title: rec.lesson.title, href: `/learn/${rec.lesson.slug}` };
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center justify-between gap-4 rounded-xl px-3 hover:bg-sunken"
      >
        <span>
          <span className="block font-medium">{title}</span>
          <span className="text-sm text-muted">{rec.reason}</span>
        </span>
        <span aria-hidden="true" className="text-muted">
          →
        </span>
      </Link>
    </li>
  );
}

export default async function DashboardPage() {
  const { db, learner } = await getContext();
  const overview = await getLearningOverview(db, learner);
  const language = getLanguageModule(learner.targetLanguage);
  const course = overview.courses[0];
  const skillLabel = (id: string) => overview.skills.find((s) => s.id === id)?.label ?? id;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${learner.displayName}`}
        description={`Studying ${language.name} · ${language.nativeName}`}
      />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Continue learning</CardTitle>
          {overview.currentLesson ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted">{course?.title}</p>
                <p className="text-xl font-semibold">{overview.currentLesson.title}</p>
              </div>
              <ButtonLink href={`/learn/${overview.currentLesson.slug}`}>Continue</ButtonLink>
            </div>
          ) : (
            <p className="mt-4 text-muted">No content found. Run npm run db:setup to load the curriculum.</p>
          )}
        </Card>

        <Card>
          <CardTitle>Last 7 days</CardTitle>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted">Attempts</dt>
              <dd className="text-2xl font-semibold tabular-nums">{overview.last7Days.attempts}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Accuracy</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {formatPercent(overview.last7Days.accuracy)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-3">
          <CardTitle>Today&apos;s recommendation</CardTitle>
          {overview.recommendations.length ? (
            <ul className="mt-3 -mx-3 divide-y divide-line">
              {overview.recommendations.map((rec, i) => (
                <RecommendationRow
                  key={i}
                  rec={rec}
                  skillLabel={rec.kind === "learn" ? "" : skillLabel(rec.skill)}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted">You are all caught up.</p>
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:col-span-3">
          {overview.skills.map((skill) => (
            <Card key={skill.id}>
              <div className="flex items-baseline justify-between gap-4">
                <CardTitle>{skill.label}</CardTitle>
                <Link href="/progress" className="text-sm text-accent">
                  Details
                </Link>
              </div>
              <div className="mt-4">
                <MasteryDistributionBar distribution={overview.distributionBySkill[skill.id]!} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
