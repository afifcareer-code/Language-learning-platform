import type { MasteryDistribution as Distribution } from "@/core/analytics";
import { MASTERY_STATES } from "@/core/mastery";
import { cn } from "@/shared/cn";
import { MASTERY_SWATCH } from "@/shared/labels";

/** Stacked bar of item counts per mastery state. Counts, not a synthetic percentage. */
export function MasteryDistributionBar({
  distribution,
  labels,
}: {
  distribution: Distribution;
  labels: Record<keyof Distribution, string>;
}) {
  const total = MASTERY_STATES.reduce((sum, s) => sum + distribution[s], 0);
  if (total === 0) return null;
  return (
    <div className="@container">
      <div
        className="flex h-3 overflow-hidden rounded-full bg-sunken"
        role="img"
        aria-label={MASTERY_STATES.map((s) => `${labels[s]}: ${distribution[s]}`).join(", ")}
      >
        {MASTERY_STATES.filter((s) => s !== "not_started" && distribution[s] > 0).map((s) => (
          <div
            key={s}
            className={cn(MASTERY_SWATCH[s])}
            style={{ width: `${(distribution[s] / total) * 100}%` }}
          />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm @lg:grid-cols-3">
        {MASTERY_STATES.map((s) => (
          <div key={s} className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-muted">
              <span className={cn("size-2.5 rounded-full", MASTERY_SWATCH[s])} />
              {labels[s]}
            </dt>
            <dd className="tabular-nums">{distribution[s]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
