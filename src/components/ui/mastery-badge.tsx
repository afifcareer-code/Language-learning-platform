import type { MasteryState } from "@/core/mastery";
import { cn } from "@/shared/cn";
import { MASTERY_LABELS, MASTERY_TONE } from "@/shared/labels";

export function MasteryBadge({ state, className }: { state: MasteryState; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        MASTERY_TONE[state],
        className,
      )}
    >
      {MASTERY_LABELS[state]}
    </span>
  );
}
