import Link from "next/link";
import { cn } from "@/shared/cn";

/**
 * Where the learner is: "日本語 Japanese · N5 · Lesson 1". Opens the learning
 * path, where the level (and the learning language) can be changed. Distinct
 * from the interface-language menu.
 */
export function LearningContextChip({
  languageCode,
  nativeName,
  languageLabel,
  levelLabel,
  lessonLabel,
  srLabel,
  compact,
  className,
}: {
  languageCode: string;
  nativeName: string;
  languageLabel: string;
  levelLabel: string;
  /** e.g. "Lesson 1 · Introductions"; omitted when the level has no lessons. */
  lessonLabel?: string;
  srLabel: string;
  /** Narrow rail: native name and level only, full details from xl. */
  compact?: boolean;
  className?: string;
}) {
  const details = [languageLabel, levelLabel, lessonLabel].filter(Boolean).join(", ");
  return (
    <Link
      href="/learn"
      aria-label={`${srLabel}: ${details}`}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 transition-colors hover:border-accent",
        className,
      )}
    >
      <span
        lang={languageCode}
        className={cn(
          "leading-none font-semibold whitespace-nowrap text-ink",
          compact ? "text-sm xl:text-base" : "hidden text-base sm:inline",
        )}
      >
        {nativeName}
      </span>
      <span className={cn("min-w-0 leading-tight", compact && "hidden xl:block")}>
        <span className="block truncate text-sm font-medium">
          {languageLabel} · {levelLabel}
        </span>
        {lessonLabel && <span className="block truncate text-xs text-muted">{lessonLabel}</span>}
      </span>
      {compact && <span className="text-xs font-medium text-muted xl:hidden">{levelLabel}</span>}
    </Link>
  );
}
