"use client";

import { useTransition } from "react";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/localization/config";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import { setUiLocale } from "./actions";

/**
 * The interface-language switch (ID / EN), always visible in the app shell.
 * It changes menus and explanations only, never the language being learned.
 */
export function UiLocaleSwitcher({ className, stacked }: { className?: string; stacked?: boolean }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <div
      role="group"
      aria-label={t("common.shell.uiLanguage")}
      className={cn(
        "inline-flex rounded-xl border border-line bg-surface p-1",
        stacked ? "flex-col xl:flex-row" : "flex-row",
        pending && "opacity-60",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("items-center px-2 text-muted", stacked ? "hidden xl:flex" : "hidden sm:flex")}
      >
        <GlobeIcon />
      </span>
      {LOCALES.map((locale: Locale) => {
        const active = t.locale === locale;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            title={LOCALE_NAMES[locale]}
            aria-label={LOCALE_NAMES[locale]}
            aria-pressed={active}
            disabled={pending}
            onClick={() => !active && startTransition(() => setUiLocale(locale))}
            className={cn(
              "min-h-10 min-w-11 rounded-lg px-2 text-sm font-semibold uppercase transition-colors",
              active ? "bg-accent-soft text-accent" : "text-muted hover:text-ink",
            )}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
