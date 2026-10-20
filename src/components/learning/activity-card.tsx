import type { ActivityStatus } from "@/core/activities";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/cn";

const STATUS_TONE: Record<ActivityStatus, string> = {
  not_started: "bg-sunken text-muted",
  in_progress: "bg-warning-soft text-warning",
  completed: "bg-accent-soft text-accent",
  outcome_achieved: "bg-success-soft text-success",
};

/** One learning activity: what you will do, why, and how it will be judged. */
export function ActivityCard({
  step,
  typeLabel,
  title,
  objective,
  status,
  statusLabel,
  criteria,
  labels,
  href,
  highlighted,
}: {
  step: number;
  typeLabel: string;
  title: string;
  objective: string;
  status: ActivityStatus;
  statusLabel: string;
  criteria: string[];
  labels: { objective: string; criteria: string; start: string };
  href: string;
  highlighted?: boolean;
}) {
  return (
    <Card className={cn("flex h-full flex-col", highlighted && "border-accent")}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-muted">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-sunken text-xs tabular-nums">
            {step}
          </span>
          {typeLabel}
        </span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_TONE[status])}>
          {statusLabel}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-xs font-medium tracking-wide text-muted uppercase">{labels.objective}</p>
      <p className="mt-1 flex-1">{objective}</p>
      <details className="mt-3 text-sm text-muted">
        <summary className="cursor-pointer py-1">{labels.criteria}</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {criteria.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
      <ButtonLink href={href} className="mt-4" variant={highlighted ? "primary" : "secondary"}>
        {labels.start}
      </ButtonLink>
    </Card>
  );
}
