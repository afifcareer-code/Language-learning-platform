"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import { SettingsIcon } from "./icons";
import { NAV_ITEMS } from "./nav-config";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const railLink =
  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-center text-xs font-medium transition-colors xl:min-h-12 xl:flex-row xl:justify-start xl:gap-3 xl:px-4 xl:text-left xl:text-sm";

/** Side rail on tablet and desktop. */
export function SideNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav aria-label={t("common.appName")} className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={cn(
            railLink,
            isActive(pathname, href)
              ? "bg-accent-soft text-accent"
              : "text-muted hover:bg-sunken hover:text-ink",
          )}
        >
          <Icon />
          {t(label)}
        </Link>
      ))}
    </nav>
  );
}

export function SettingsNavLink() {
  const pathname = usePathname();
  const t = useT();
  return (
    <Link
      href="/settings"
      aria-current={isActive(pathname, "/settings") ? "page" : undefined}
      className={cn(
        railLink,
        isActive(pathname, "/settings")
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-sunken hover:text-ink",
      )}
    >
      <SettingsIcon />
      {t("common.nav.settings")}
    </Link>
  );
}

/** Settings shortcut in the mobile header (the tab bar holds the five learning sections). */
export function MobileSettingsLink() {
  const t = useT();
  return (
    <Link
      href="/settings"
      className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-ink md:hidden"
      aria-label={t("common.nav.settings")}
    >
      <SettingsIcon />
    </Link>
  );
}

/** Bottom tab bar on phones. */
export function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav
      aria-label={t("common.appName")}
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={cn(
            "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
            isActive(pathname, href) ? "text-accent" : "text-muted",
          )}
        >
          <Icon />
          {t(label)}
        </Link>
      ))}
    </nav>
  );
}
