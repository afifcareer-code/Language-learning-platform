import type { MasteryState } from "@/core/mastery";
import { cn } from "@/shared/cn";
import { MASTERY_TONE } from "@/shared/labels";

export function MasteryBadge({
  state,
  label,
  className,
}: {
  state: MasteryState;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        MASTERY_TONE[state],
        className,
      )}
    >
      {label}
    </span>
  );
}
