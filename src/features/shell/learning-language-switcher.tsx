import Link from "next/link";
import { cn } from "@/shared/cn";

/**
 * "Change learning language": always one step from language selection, from
 * any learning page. A plain link to the generic language selection, so it
 * works the same for every language and never touches progress. Not the
 * interface-language menu, which only changes the language of the app.
 */
export function LearningLanguageSwitcher({
  label,
  srLabel,
  compact,
  className,
}: {
  /** Visible text, e.g. "Change language". */
  label: string;
  /** Accessible name, e.g. "Change learning language". */
  srLabel: string;
  /** Icon only (narrow header and rail); the label stays available to screen readers. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/languages"
      aria-label={srLabel}
      title={srLabel}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium",
        "text-ink transition-colors hover:border-accent",
        compact ? "min-w-11" : "w-full",
        className,
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
      </svg>
      <span className={cn(compact && "sr-only")}>{label}</span>
    </Link>
  );
}
