"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/localization/config";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import { setUiLocale } from "./actions";

/**
 * The interface-language menu ("🌐 Bahasa Indonesia ▾"), always available in
 * the app shell. It changes menus and explanations only, never the language
 * being learned. `compact` shows the locale code instead of the name (mobile
 * header, narrow rail); `placement="up"` opens the menu above the button.
 */
export function UiLocaleSwitcher({
  className,
  compact,
  placement = "down",
}: {
  className?: string;
  compact?: "always" | "below-xl";
  placement?: "up" | "down";
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const current = t.locale as Locale;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(locale: Locale) {
    setOpen(false);
    button.current?.focus();
    if (locale !== current) startTransition(() => setUiLocale(locale));
  }

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div ref={root} className={cn("relative", pending && "opacity-60", className)}>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${t("common.shell.uiLanguage")}: ${LOCALE_NAMES[current]}`}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-accent xl:justify-start"
      >
        <GlobeIcon />
        <span
          className={cn(
            "uppercase",
            compact === "below-xl" && "xl:hidden",
            compact === undefined && "hidden",
          )}
        >
          {current}
        </span>
        {compact !== "always" && (
          <span className={cn("truncate", compact === "below-xl" && "hidden xl:inline")} lang={current}>
            {LOCALE_NAMES[current]}
          </span>
        )}
        <span aria-hidden="true" className="ml-auto text-xs text-muted">
          ▾
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("common.shell.uiLanguage")}
          onKeyDown={onMenuKey}
          className={cn(
            "absolute z-30 min-w-52 rounded-xl border border-line bg-surface p-1 shadow-lg",
            placement === "up" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2",
          )}
        >
          <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted">{t("common.shell.uiLanguage")}</p>
          {LOCALES.map((locale) => {
            const active = locale === current;
            return (
              <button
                key={locale}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={locale}
                onClick={() => choose(locale)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm",
                  active ? "bg-accent-soft font-medium text-accent" : "hover:bg-sunken",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border",
                    active ? "border-accent" : "border-line",
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-accent-fill" />}
                </span>
                {LOCALE_NAMES[locale]}
              </button>
            );
          })}
        </div>
      )}
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
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
