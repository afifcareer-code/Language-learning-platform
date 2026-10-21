"use client";

import { useRouter } from "next/navigation";
import { summarizeSession, type SessionResult } from "@/core/activities";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MasteryDistributionBar } from "@/components/ui/mastery-distribution";
import { MASTERY_STATES, type MasteryState } from "@/core/mastery";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";

/**
 * The learning outcome of a session: what the objective was, how it went,
 * how mastery changed and when the items come back.
 */
export function SessionOutcome({
  results,
  passScore,
  objective,
  skillLabel,
  displayOf,
  displayLang,
}: {
  results: SessionResult[];
  passScore: number;
  objective: string;
  skillLabel: string;
  displayOf: Record<string, string>;
  displayLang: string;
}) {
  const t = useT();
  const router = useRouter();
  const outcome = summarizeSession(results, passScore);
  const missed = [...new Set(results.filter((r) => !r.correct).map((r) => r.contentItemId))];
  const labels = Object.fromEntries(MASTERY_STATES.map((s) => [s, t(`common.mastery.${s}`)])) as Record<
    MasteryState,
    string
  >;

  return (
    <Card className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-muted">{t("practice.outcome.title")}</p>
      <dl className="mt-4 space-y-4">
        <div>
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t("practice.outcome.objective")}
          </dt>
          <dd className="mt-1">{objective}</dd>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
              {t("practice.outcome.skill")}
            </dt>
            <dd className="mt-1">{skillLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
              {t("practice.outcome.nextReview")}
            </dt>
            <dd className="mt-1">{outcome.nextReviewAt ? t.relativeTime(outcome.nextReviewAt) : "—"}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-4xl font-semibold tabular-nums">{t.percent(outcome.score)}</p>
        <p className="text-muted">
          {t("practice.outcome.result", { correct: outcome.correct, total: outcome.total })}
        </p>
      </div>
      <p className={cn("mt-2 font-medium", outcome.passed ? "text-success" : "text-warning")}>
        {outcome.passed
          ? t("practice.outcome.passed")
          : t("practice.outcome.notPassed", { pass: t.percent(passScore) })}
      </p>

      <div className="mt-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          {t("practice.outcome.masteryChanged")}
        </p>
        <p className="mt-1 text-sm">
          {t("practice.outcome.improved", { count: outcome.improved })}
          {outcome.declined > 0 && ` · ${t("practice.outcome.declined", { count: outcome.declined })}`}
        </p>
        <div className="mt-3">
          <MasteryDistributionBar distribution={outcome.masteryAfter} labels={labels} />
        </div>
      </div>

      {missed.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t("practice.outcome.toRevisit")}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missed.map((id) => (
              <li key={id} lang={displayLang} className="rounded-lg bg-sunken px-3 py-1 font-jp text-xl">
                {displayOf[id]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => router.refresh()}>
          {t("common.actions.practiceAgain")}
        </Button>
        <ButtonLink href="/dashboard">{t("common.actions.done")}</ButtonLink>
      </div>
    </Card>
  );
}
