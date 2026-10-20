import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

/** One level of a proficiency framework (e.g. JLPT N5, CEFR A1, or a platform stage). */
export function ProficiencyCard({
  code,
  title,
  description,
  badge,
  enabled,
  current,
  action,
}: {
  /** Short code shown large, e.g. "N5"; for platform stages, the stage title. */
  code: string;
  title?: string;
  description: string | null;
  badge?: string;
  enabled: boolean;
  current?: boolean;
  action?: ReactNode;
}) {
  return (
    <li
      aria-disabled={!enabled || undefined}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center",
        enabled ? "border-line bg-surface" : "border-dashed border-line text-muted",
        current && "border-accent ring-1 ring-accent",
      )}
    >
      <span
        className={cn(
          "flex min-h-14 min-w-20 shrink-0 items-center justify-center rounded-xl px-3 text-xl font-semibold",
          enabled ? "bg-accent-soft text-accent" : "bg-sunken",
        )}
      >
        {code}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {title && <p className="font-semibold text-ink">{title}</p>}
          {badge && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                current ? "bg-accent-soft text-accent" : "bg-sunken text-muted",
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </li>
  );
}
