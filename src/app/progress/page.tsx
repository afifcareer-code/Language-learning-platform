import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui/card";
import { MasteryDistributionBar } from "@/components/ui/mastery-distribution";
import { PageHeader } from "@/components/ui/page-header";
import { KanaGrid } from "@/features/kana/kana-grid";
import { toKanaViews } from "@/features/kana/kana-view";
import { KANA_CONTENT_TYPE, KANA_SCRIPTS } from "@/languages/japanese";
import { getContext } from "@/server/context";
import { listContentItemsByType } from "@/server/repositories/content";
import { getRecentAttempts, progressKey } from "@/server/repositories/progress";
import { getLearningOverview } from "@/server/services/overview";
import { cn } from "@/shared/cn";

export const metadata: Metadata = { title: "Progress" };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export default async function ProgressPage() {
  const { db, learner } = await getContext();
  const [overview, items, recent] = await Promise.all([
    getLearningOverview(db, learner),
    listContentItemsByType(db, learner.targetLanguage, KANA_CONTENT_TYPE),
    getRecentAttempts(db, learner.id, { limit: 20 }),
  ]);
  const kana = toKanaViews(items);
  const kanaById = new Map(kana.map((k) => [k.id, k]));
  const skillLabel = (id: string) => overview.skills.find((s) => s.id === id)?.label ?? id;

  return (
    <>
      <PageHeader
        title="Progress"
        description="Mastery is tracked per character and per skill, based on recall over time."
      />

      {overview.skills.map((skill) => (
        <section key={skill.id} className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">{skill.label}</h2>
          <Card className="mb-4">
            <MasteryDistributionBar distribution={overview.distributionBySkill[skill.id]!} />
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            {KANA_SCRIPTS.map((script) => {
              const forScript = kana.filter((k) => k.script === script);
              const states = Object.fromEntries(
                forScript.map((k) => [
                  k.id,
                  overview.progress.get(progressKey(k.id, skill.id))?.state ?? "not_started",
                ]),
              );
              return (
                <Card key={script}>
                  <CardTitle className="mb-4 capitalize">{script}</CardTitle>
                  <KanaGrid items={forScript} states={states} />
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Learning history</h2>
        <Card>
          {recent.length === 0 ? (
            <p className="text-muted">No attempts yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center gap-4 py-3">
                  <span lang="ja" className="w-10 text-center font-jp text-2xl">
                    {kanaById.get(a.contentItemId)?.kana}
                  </span>
                  <span className="flex-1">
                    <span className="block">{skillLabel(a.skill)}</span>
                    <span className="text-sm text-muted">
                      {a.mode} · {dateFormat.format(a.createdAt)}
                    </span>
                  </span>
                  <span className={cn("text-sm font-medium", a.correct ? "text-success" : "text-danger")}>
                    {a.correct ? "Correct" : "Missed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
