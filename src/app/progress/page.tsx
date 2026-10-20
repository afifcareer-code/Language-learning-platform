import type { Metadata } from "next";
import Link from "next/link";
import { MasteryCard } from "@/components/learning/mastery-card";
import { ProgressRing } from "@/components/learning/progress-ring";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { KanaGrid } from "@/features/kana/kana-grid";
import { itemDisplay, toKanaViews } from "@/features/kana/kana-view";
import { confusionHref } from "@/features/practice/routes";
import { KANA_CONTENT_TYPE, KANA_SCRIPTS } from "@/languages/japanese";
import { masteryLabels, skillLabel } from "@/localization/labels";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getContentItems, listContentItemsByType } from "@/server/repositories/content";
import { getRecentAttempts, progressKey } from "@/server/repositories/progress";
import { getLearningOverview } from "@/server/services/overview";
import { cn } from "@/shared/cn";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("progress.title") };
}

export default async function ProgressPage() {
  const { db, learner } = await getContext();
  const { locale, t } = await getI18n();
  const [overview, items, recent] = await Promise.all([
    getLearningOverview(db, learner, locale),
    listContentItemsByType(db, learner.targetLanguage, KANA_CONTENT_TYPE),
    getRecentAttempts(db, learner.id, { limit: 20 }),
  ]);
  const kana = toKanaViews(items);
  const display = new Map(kana.map((k) => [k.id, k.kana]));
  const pairs = [...overview.confusionPairs].sort((a, b) => b.errorCount - a.errorCount);
  for (const i of await getContentItems(
    db,
    pairs.flatMap((p) => [p.itemA, p.itemB]),
  ))
    display.set(i.id, itemDisplay(i));
  const labels = masteryLabels(t);

  return (
    <>
      <PageHeader title={t("progress.title")} description={t("progress.description")} />

      <div className="mb-10 grid gap-4 md:grid-cols-3 md:gap-6">
        {overview.skillMastery.map((m) => (
          <Card key={m.skill} className="flex items-center gap-4">
            <ProgressRing ratio={m.ratio} label={t.percent(m.ratio)} tone="success" />
            <div>
              <p className="font-medium">{skillLabel(t, m.skill)}</p>
              <p className="text-sm text-muted">
                {t("dashboard.metrics.skillMasteryDetail", { demonstrated: m.demonstrated, total: m.total })}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {overview.skills.map((skill) => (
        <section key={skill.id} className="mb-10">
          <MasteryCard
            title={skillLabel(t, skill.id)}
            distribution={overview.distributionBySkill[skill.id]!}
            labels={labels}
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                  <CardTitle className="mb-4">
                    {t.dynamic(["ja", "scripts", script], undefined, script)}
                  </CardTitle>
                  <KanaGrid items={forScript} states={states} labels={labels} />
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("progress.confusion.title")}</h2>
          <Card>
            {pairs.length === 0 ? (
              <p className="text-muted">{t("progress.confusion.empty")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {pairs.map((p) => (
                  <li key={`${p.itemA}-${p.itemB}`} className="flex items-center gap-4 py-3">
                    <span lang="ja" className="font-jp text-2xl">
                      {display.get(p.itemA)} ↔ {display.get(p.itemB)}
                    </span>
                    <span className="flex-1 text-sm text-muted">
                      {t("progress.confusion.errors", { count: p.errorCount })} ·{" "}
                      {t(`progress.confusion.status.${p.status}`)}
                    </span>
                    {p.status !== "resolved" && (
                      <Link
                        href={confusionHref(p.itemA, p.itemB)}
                        className="text-sm font-medium text-accent"
                      >
                        {t("progress.confusion.practice")}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("progress.history")}</h2>
          <Card>
            {recent.length === 0 ? (
              <p className="text-muted">{t("progress.noAttempts")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((a) => (
                  <li key={a.id} className="flex items-center gap-4 py-3">
                    <span lang="ja" className="w-10 text-center font-jp text-2xl">
                      {display.get(a.contentItemId)}
                    </span>
                    <span className="flex-1">
                      <span className="block">{skillLabel(t, a.skill)}</span>
                      <span className="text-sm text-muted">
                        {t.dynamic(["progress", "modes", a.mode], undefined, a.mode)} · {t.date(a.createdAt)}
                      </span>
                    </span>
                    <span className={cn("text-sm font-medium", a.correct ? "text-success" : "text-danger")}>
                      {a.correct ? t("progress.correct") : t("progress.missed")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
