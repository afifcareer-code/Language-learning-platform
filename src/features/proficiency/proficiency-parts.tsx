import { Card, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import type { CompetencyStatus, ReadinessReason, ReadinessState } from "@/core/proficiency";
import type { Messages } from "@/localization/messages";
import type { Translator } from "@/localization/translator";
import type { CompetencyView, ProficiencyView } from "@/server/services/proficiency";
import { assessmentHref } from "@/features/practice/routes";
import { cn } from "@/shared/cn";

type T = Translator<Messages>;

const STATUS_TONE: Record<CompetencyStatus, string> = {
  planned: "bg-sunken text-muted",
  not_started: "bg-sunken text-ink",
  developing: "bg-warning-soft text-warning",
  secure: "bg-success-soft text-success",
  retained: "bg-success-soft text-success",
};

const READINESS_TONE: Record<ReadinessState, string> = {
  not_ready: "bg-sunken text-ink",
  developing: "bg-warning-soft text-warning",
  assessment_ready: "bg-accent-soft text-accent",
  certification_ready: "bg-success-soft text-success",
};

/** Generic: knows nothing about a particular language or exam. */
export function CompetencyProgress({ competency, t }: { competency: CompetencyView; t: T }) {
  const ratio = competency.total === 0 ? 0 : competency.secure / competency.total;
  return (
    <li
      className="rounded-xl border border-line bg-surface px-4 py-3"
      data-testid={`competency-${competency.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{competency.title}</p>
          <p className="text-sm text-muted">
            {t.dynamic(["proficiency", "domains", competency.domain], undefined, competency.domain)}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            STATUS_TONE[competency.status],
          )}
        >
          {t(`proficiency.competencies.status.${competency.status}`)}
        </span>
      </div>
      {competency.status === "planned" ? (
        <p className="mt-2 text-sm text-muted">{t("proficiency.competencies.planned")}</p>
      ) : (
        <>
          <div
            role="progressbar"
            aria-label={competency.title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
            className="mt-3 h-2 overflow-hidden rounded-full bg-sunken"
          >
            <div className="h-full bg-accent" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {t("proficiency.competencies.evidence", {
              secure: competency.secure,
              total: competency.total,
              retained: competency.retained,
            })}
          </p>
        </>
      )}
    </li>
  );
}

function reasonText(t: T, reason: ReadinessReason, titles: Map<string, string>): string {
  switch (reason.code) {
    case "competency_not_secure":
    case "competency_not_retained":
    case "competency_planned":
      return t(`proficiency.readiness.reasons.${reason.code}`, {
        competency: titles.get(reason.competency) ?? reason.competency,
      });
    case "assessment_section_failed":
      return t("proficiency.readiness.reasons.assessment_section_failed", {
        section: t.dynamic(
          ["proficiency", "assessment", "sections", reason.section],
          undefined,
          reason.section,
        ),
      });
    default:
      return t(`proficiency.readiness.reasons.${reason.code}`);
  }
}

export function ReadinessCard({ view, t }: { view: ProficiencyView; t: T }) {
  const { readiness } = view;
  const titles = new Map(view.competencies.map((c) => [c.id, c.title]));
  return (
    <Card aria-labelledby="readiness-title" data-testid="readiness-card">
      <CardTitle id="readiness-title">{t("proficiency.readiness.title")}</CardTitle>
      <p className="mt-3 flex flex-wrap items-center gap-2">
        <span
          data-testid="readiness-state"
          className={cn("rounded-full px-3 py-1 text-sm font-semibold", READINESS_TONE[readiness.state])}
        >
          {t(`proficiency.readiness.state.${readiness.state}`)}
        </span>
        <span className="text-sm text-muted">{t("proficiency.readiness.examNote")}</span>
      </p>
      <p className="mt-3">{t(`proficiency.readiness.summary.${readiness.state}`)}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium">{t("proficiency.readiness.strengths")}</h3>
          {readiness.strengths.length === 0 ? (
            <p className="mt-1 text-sm text-muted">{t("proficiency.readiness.none")}</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-sm">
              {readiness.strengths.map((id) => (
                <li key={id}>{titles.get(id) ?? id}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium">{t("proficiency.readiness.gaps")}</h3>
          {readiness.gaps.length === 0 ? (
            <p className="mt-1 text-sm text-muted">{t("proficiency.readiness.none")}</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-sm">
              {readiness.gaps.map((g, i) => (
                <li key={i}>{reasonText(t, g, titles)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

export function AssessmentEvidence({ view, t }: { view: ProficiencyView; t: T }) {
  const { result, sections } = view.assessment;
  const sectionName = (id: string) => t.dynamic(["proficiency", "assessment", "sections", id], undefined, id);
  return (
    <Card aria-labelledby="assessment-title" data-testid="assessment-card">
      <CardTitle id="assessment-title">{t("proficiency.assessment.title")}</CardTitle>
      <p className="mt-2 text-sm text-muted">{t("proficiency.assessment.intro")}</p>
      <p className="mt-1 text-sm text-muted">{t("proficiency.assessment.notOfficial")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {sections.map((s) =>
          s.available > 0 ? (
            <ButtonLink key={s.id} href={assessmentHref(view.level.slug, s.id)} variant="secondary">
              {t("proficiency.assessment.start", { section: sectionName(s.id) })}
            </ButtonLink>
          ) : (
            <span key={s.id} className="text-sm text-muted">
              {sectionName(s.id)}: {t("proficiency.assessment.noItems")}
            </span>
          ),
        )}
      </div>
      <div className="mt-4" data-testid="assessment-result">
        <h3 className="text-sm font-medium">{t("proficiency.assessment.mockLabel")}</h3>
        {!result ? (
          <p className="mt-1 text-sm text-muted">{t("proficiency.assessment.notTaken")}</p>
        ) : (
          <>
            <ul className="mt-1 text-sm">
              {result.sections.map((s) => (
                <li key={s.id}>
                  {t("proficiency.assessment.section", {
                    section: sectionName(s.id),
                    correct: s.correct,
                    total: s.total,
                    score: t.percent(s.score),
                  })}
                  {s.total > 0 && s.novel < s.total
                    ? ` ${t("proficiency.assessment.novel", { novel: s.novel, total: s.total })}`
                    : ""}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm font-medium">
              {t("proficiency.assessment.overall", {
                correct: result.correct,
                total: result.total,
                score: t.percent(result.score),
              })}{" "}
              · {result.passed ? t("proficiency.assessment.passed") : t("proficiency.assessment.failed")}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

export function ProficiencyOverview({
  view,
  t,
  frameworkLabel,
  prerequisiteLabel,
}: {
  view: ProficiencyView;
  t: T;
  frameworkLabel: string;
  prerequisiteLabel: string;
}) {
  const exam = view.competencies.filter((c) => c.examAligned);
  const beyond = view.competencies.filter((c) => !c.examAligned);
  return (
    <div className="grid gap-4 md:gap-6">
      <Card aria-labelledby="entry-title">
        <CardTitle id="entry-title">{t("proficiency.internalStandard")}</CardTitle>
        <p className="mt-2 text-sm text-muted">
          {t("proficiency.internalStandardNote", { framework: frameworkLabel })}
        </p>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          {(["learn", "need", "know", "ready"] as const).map((key) => (
            <div key={key}>
              <dt className="font-medium">{t(`proficiency.entry.${key}Title`)}</dt>
              <dd className="mt-1 text-sm text-muted">
                {key === "need"
                  ? t("proficiency.entry.needBody", { level: prerequisiteLabel })
                  : t(`proficiency.entry.${key}Body`)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm" data-testid="prerequisite-status">
          <strong>{t("proficiency.prerequisite.title", { level: prerequisiteLabel })}.</strong>{" "}
          {view.prerequisite.met
            ? t("proficiency.prerequisite.met", { target: view.level.title })
            : t("proficiency.prerequisite.unmet", { level: prerequisiteLabel })}
        </p>
      </Card>

      <ReadinessCard view={view} t={t} />

      <Card aria-labelledby="exam-title">
        <CardTitle id="exam-title">{t("proficiency.competencies.examTitle")}</CardTitle>
        <ul className="mt-3 grid gap-3">
          {exam.map((c) => (
            <CompetencyProgress key={c.id} competency={c} t={t} />
          ))}
        </ul>
      </Card>

      {beyond.length > 0 && (
        <Card aria-labelledby="mastery-title">
          <CardTitle id="mastery-title">{t("proficiency.competencies.platformTitle")}</CardTitle>
          <p className="mt-2 text-sm text-muted">{t("proficiency.competencies.platformNote")}</p>
          <ul className="mt-3 grid gap-3">
            {beyond.map((c) => (
              <CompetencyProgress key={c.id} competency={c} t={t} />
            ))}
          </ul>
        </Card>
      )}

      <AssessmentEvidence view={view} t={t} />
      <p className="text-sm text-muted">{t("proficiency.disclaimer")}</p>
    </div>
  );
}
