import type { MasteryState } from "@/core/mastery";

/**
 * Progressive writing guidance: the scaffold fades as mastery grows,
 * moving the learner toward writing from memory.
 */
export const WRITING_STAGES = ["full_example", "faded_example", "minimal_hint", "recall"] as const;
export type WritingStage = (typeof WRITING_STAGES)[number];

export const WRITING_STAGE_LABELS: Record<WritingStage, string> = {
  full_example: "Trace",
  faded_example: "Faded guide",
  minimal_hint: "Hint only",
  recall: "From memory",
};

/** Opacity of the model character drawn behind the canvas. */
export const GUIDE_OPACITY: Record<WritingStage, number> = {
  full_example: 0.28,
  faded_example: 0.1,
  minimal_hint: 0,
  recall: 0,
};

export function writingStageFor(state: MasteryState): WritingStage {
  switch (state) {
    case "not_started":
    case "learning":
      return "full_example";
    case "practicing":
    case "needs_review":
      return "faded_example";
    case "proficient":
      return "minimal_hint";
    case "mastered":
      return "recall";
  }
}
