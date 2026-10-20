import { BookIcon, ChartIcon, HomeIcon, PenIcon, RepeatIcon, SettingsIcon } from "./icons";

/**
 * Primary navigation. Only sections with working features are listed;
 * Assessment and JLPT appear once they are implemented.
 */
export const NAV_ITEMS = [
  { href: "/", label: "common.nav.dashboard", icon: HomeIcon, mobile: true },
  { href: "/learn", label: "common.nav.learn", icon: BookIcon, mobile: true },
  { href: "/practice", label: "common.nav.practice", icon: PenIcon, mobile: true },
  { href: "/review", label: "common.nav.review", icon: RepeatIcon, mobile: true },
  { href: "/progress", label: "common.nav.progress", icon: ChartIcon, mobile: true },
  { href: "/settings", label: "common.nav.settings", icon: SettingsIcon, mobile: false },
] as const;
