import { BookIcon, ChartIcon, HomeIcon, PenIcon, RepeatIcon } from "./icons";

/**
 * Primary navigation for the current learning language. Only sections with
 * working features are listed; Assessment appears once it is implemented.
 * Settings and the language switchers live in the shell's context area.
 */
export const NAV_ITEMS = [
  { href: "/dashboard", label: "common.nav.dashboard", icon: HomeIcon },
  { href: "/learn", label: "common.nav.learn", icon: BookIcon },
  { href: "/practice", label: "common.nav.practice", icon: PenIcon },
  { href: "/review", label: "common.nav.review", icon: RepeatIcon },
  { href: "/progress", label: "common.nav.progress", icon: ChartIcon },
] as const;
