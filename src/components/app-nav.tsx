"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/cn";
import { NAV_ITEMS } from "./nav-config";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Side rail on tablet and desktop. */
export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium transition-colors xl:flex-row xl:justify-start xl:gap-3 xl:px-4 xl:text-sm",
            isActive(pathname, href)
              ? "bg-accent-soft text-accent"
              : "text-muted hover:bg-sunken hover:text-ink",
          )}
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom tab bar on phones. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
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
          {label}
        </Link>
      ))}
    </nav>
  );
}
