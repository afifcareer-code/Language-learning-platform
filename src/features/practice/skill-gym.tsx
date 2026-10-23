import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { SkillGymCard } from "@/components/learning/skill-gym-card";
import type { Messages } from "@/localization/messages";
import type { Translator } from "@/localization/translator";
import type { PracticeSkillOverview } from "@/server/services/practice-skills";
import { stageHref } from "./routes";

/** The Practice skills with their stage ladders. Independent of the course and its levels. */
export function SkillGym({ overview, t }: { overview: PracticeSkillOverview[]; t: Translator<Messages> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
      {overview.map(({ skill, progress }) => {
        const skillName = t.dynamic(["practice", "skills", skill.id], undefined, skill.id);
        const focusOf = (stageId: string) => t.dynamic(["practice", "focus", stageId], undefined, stageId);
        const nextFocus = focusOf(progress.nextStageId);
        const reasonParams = {
          stage: nextFocus,
          weak: progress.weakStageId ? focusOf(progress.weakStageId) : "",
        };
        return (
          <SkillGymCard
            key={skill.id}
            title={skillName}
            ladderLabel={t("practice.hub.ladder", { skill: skillName })}
            reason={t.dynamic(["practice", "reason", progress.reason], reasonParams, "")}
            stages={skill.stages.map((spec, index) => {
              const p = progress.stages.find((s) => s.stageId === spec.id)!;
              const detail =
                p.status === "planned"
                  ? t("practice.hub.plannedNote")
                  : p.mastery !== null
                    ? `${t("practice.hub.recentScore", { percent: Math.round(p.mastery * 100) })} · ${t("practice.hub.attempts", { count: p.attempts })}`
                    : p.attempts > 0
                      ? t("practice.hub.needsAttempts", {
                          count: spec.requirement.minAttempts - p.attempts,
                        })
                      : "";
              return {
                id: spec.id,
                heading: t("practice.hub.stageHeading", { n: index + 1, focus: focusOf(spec.id) }),
                status: p.status,
                statusLabel: t(`practice.stageStatus.${p.status}`),
                detail,
                isNext: spec.id === progress.nextStageId,
              };
            })}
            startHref={stageHref(skill.id, progress.nextStageId)}
            startLabel={t("practice.hub.start", { n: progress.nextStageNumber })}
          />
        );
      })}
    </div>
  );
}

/** Dashboard summary: the stage each Practice skill is at, apart from the course. */
export function PracticeSummary({
  overview,
  t,
}: {
  overview: PracticeSkillOverview[];
  t: Translator<Messages>;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>{t("dashboard.practice.title")}</CardTitle>
          <p className="mt-1 text-sm text-muted">{t("dashboard.practice.description")}</p>
        </div>
        <Link href="/practice" className="inline-flex min-h-11 items-center text-sm font-medium text-accent">
          {t("dashboard.practice.open")}
        </Link>
      </div>
      <ul className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {overview.map(({ skill, progress }) => (
          <li key={skill.id} className="flex items-center justify-between gap-3 border-t border-line py-2">
            <span>{t.dynamic(["practice", "skills", skill.id], undefined, skill.id)}</span>
            <span className="text-sm text-muted">
              {t("practice.hub.stageHeading", {
                n: progress.nextStageNumber,
                focus: t.dynamic(
                  ["practice", "focus", progress.nextStageId],
                  undefined,
                  progress.nextStageId,
                ),
              })}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
