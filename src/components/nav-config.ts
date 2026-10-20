import { BookIcon, ChartIcon, HomeIcon, PenIcon, RepeatIcon } from "./icons";

/** Primary navigation. Only sections with working features are listed. */
export const NAV_ITEMS = [
  { href: "/", label: "Today", icon: HomeIcon },
  { href: "/learn", label: "Learn", icon: BookIcon },
  { href: "/practice", label: "Practice", icon: PenIcon },
  { href: "/review", label: "Review", icon: RepeatIcon },
  { href: "/progress", label: "Progress", icon: ChartIcon },
] as const;
