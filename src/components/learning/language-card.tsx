import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

/**
 * A language in the catalog. Available languages are links; planned ones are
 * shown, clearly marked, and not interactive.
 */
export function LanguageCard({
  code,
  nativeName,
  name,
  framework,
  statusLabel,
  available,
  href,
  detail,
  highlighted,
  action,
}: {
  /** BCP 47 code, so the native name is announced in its own language. */
  code: string;
  nativeName: string;
  name: string;
  framework: string;
  statusLabel: string;
  available: boolean;
  href?: string;
  detail?: string;
  highlighted?: boolean;
  action?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span lang={code} className="text-3xl leading-tight font-semibold tracking-tight">
          {nativeName}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            available ? "bg-success-soft text-success" : "bg-sunken text-muted",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <p className="mt-3 text-lg font-semibold">{name}</p>
      <p className="text-sm text-muted">{framework}</p>
      {detail && <p className="mt-3 text-sm font-medium text-accent">{detail}</p>}
    </>
  );
  const frame = cn(
    "flex h-full flex-col rounded-2xl border p-5 text-left transition-colors",
    available ? "border-line bg-surface" : "border-dashed border-line bg-transparent text-muted",
    available && href && "hover:border-accent",
    highlighted && "border-accent ring-1 ring-accent",
  );

  if (!available || !href) {
    return (
      <div className={frame} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <div className={frame}>
      <Link href={href} className="flex-1 rounded-xl outline-offset-4">
        {body}
      </Link>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
