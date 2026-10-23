import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/cn";

export interface SkillGymStage {
  id: string;
  /** "Stage 2: Word". */
  heading: string;
  status: "planned" | "locked" | "current" | "passed" | "needs_work";
  statusLabel: string;
  /** "78% recently · 12 attempts", or what is missing. */
  detail: string;
  isNext: boolean;
}

const MARK: Record<SkillGymStage["status"], string> = {
  planned: "○",
  locked: "○",
  current: "●",
  passed: "✓",
  needs_work: "!",
};

const TONE: Record<SkillGymStage["status"], string> = {
  planned: "text-muted",
  locked: "text-muted",
  current: "text-accent",
  passed: "text-success",
  needs_work: "text-warning",
};

/**
 * One Practice skill: its stages from simplest to most complex, where the learner
 * stands, and why the next stage was chosen. Generic: no language is mentioned here.
 */
export function SkillGymCard({
  title,
  ladderLabel,
  reason,
  stages,
  startHref,
  startLabel,
}: {
  title: string;
  ladderLabel: string;
  reason: string;
  stages: SkillGymStage[];
  startHref: string;
  startLabel: string;
}) {
  return (
    <Card className="flex flex-col" data-testid="skill-gym-card">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{reason}</p>
      <ol aria-label={ladderLabel} className="mt-4 flex-1 divide-y divide-line">
        {stages.map((s) => (
          <li
            key={s.id}
            className={cn("flex items-start gap-3 py-2", s.isNext && "font-medium")}
            aria-current={s.isNext ? "step" : undefined}
          >
            <span aria-hidden="true" className={cn("mt-0.5 w-4 shrink-0 text-center", TONE[s.status])}>
              {MARK[s.status]}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn(s.status === "planned" && "text-muted")}>{s.heading}</span>
              {s.detail && <span className="block text-xs font-normal text-muted">{s.detail}</span>}
            </span>
            <span className={cn("shrink-0 text-xs", TONE[s.status])}>{s.statusLabel}</span>
          </li>
        ))}
      </ol>
      <ButtonLink href={startHref} className="mt-5">
        {startLabel}
      </ButtonLink>
    </Card>
  );
}
