import { cn } from "@/shared/cn";

/**
 * The platform mark: "A文", the common glyph for "language". It pairs a
 * Latin and a CJK character so the brand is not tied to one language.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-fill text-sm font-semibold tracking-tight text-white",
        className,
      )}
    >
      A<span className="font-jp">文</span>
    </span>
  );
}
