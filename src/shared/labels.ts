import type { MasteryState } from "@/core/mastery";

/** Tailwind classes per state; used consistently in badges, grids and legends. */
export const MASTERY_TONE: Record<MasteryState, string> = {
  not_started: "bg-sunken text-muted",
  learning: "bg-warning-soft text-warning",
  practicing: "bg-accent-soft text-accent",
  proficient: "bg-accent text-accent-ink",
  mastered: "bg-success text-accent-ink",
  needs_review: "bg-danger-soft text-danger",
};

/** Solid colours for small marks (legend dots, distribution bars) where soft tints are too faint. */
export const MASTERY_SWATCH: Record<MasteryState, string> = {
  not_started: "bg-line",
  learning: "bg-warning-fill",
  practicing: "bg-accent-fill/45",
  proficient: "bg-accent-fill",
  mastered: "bg-success-fill",
  needs_review: "bg-danger",
};
