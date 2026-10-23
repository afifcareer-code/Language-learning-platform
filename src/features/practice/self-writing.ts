/** How the learner rates a word or sentence they wrote by hand, against the model. */
export const SELF_WRITING_RATINGS = ["correct", "partly", "incorrect"] as const;
export type SelfWritingRating = (typeof SELF_WRITING_RATINGS)[number];

/** Nothing reads the handwriting, so the rating is the evidence; "partly" is credit, not a pass. */
export const SELF_WRITING_SCORE: Record<SelfWritingRating, number> = {
  correct: 1,
  partly: 0.6,
  incorrect: 0,
};
