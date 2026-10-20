import Link from "next/link";
import { cn } from "@/shared/cn";

/**
 * Shows what is being learned ("日本語 · Japanese · Foundation") and opens the
 * learning-language switcher. Distinct from the interface-language switch.
 */
export function LearningContextChip({
  nativeName,
  languageLabel,
  levelLabel,
  srLabel,
  compact,
  className,
}: {
  nativeName: string;
  languageLabel: string;
  levelLabel: string;
  srLabel: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/languages"
      aria-label={`${srLabel}: ${languageLabel}, ${levelLabel}`}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 transition-colors hover:border-accent",
        className,
      )}
    >
      <span
        className={cn(
          "leading-none font-semibold whitespace-nowrap text-ink",
          compact ? "text-sm xl:text-base" : "text-base",
        )}
      >
        {nativeName}
      </span>
      <span className={cn("min-w-0 leading-tight", compact && "hidden xl:block")}>
        <span className="block truncate text-sm font-medium">{languageLabel}</span>
        <span className="block truncate text-xs text-muted">{levelLabel}</span>
      </span>
      {compact && <span className="text-xs font-medium text-muted xl:hidden">{levelLabel}</span>}
    </Link>
  );
}
