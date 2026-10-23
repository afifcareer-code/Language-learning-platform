/**
 * Practice: continuous skill training, outside any curriculum.
 *
 * Learn answers "what should I know for this level?". Practice answers "can I
 * actually use it?". A practice skill has an ordered ladder of stages ranked by
 * complexity (a character, a word, a phrase, a sentence…), not by proficiency
 * level. Progress is evidence from attempts, per stage; nothing here is tied to
 * a lesson, and nothing here refers to a specific language.
 */

import type { ActivityType } from "../activities";
import type { Capability, SkillId } from "../learning";

/** How the engine decides to move a learner along a skill's stages. All values are configurable. */
export interface StageRequirement {
  /** Attempts needed before the stage can be judged. */
  minAttempts: number;
  /** Only the latest attempts count, so recent performance decides. */
  window: number;
  /** Mean score at or above this passes the stage. */
  promoteAt: number;
  /** Mean score below this sends the learner one stage back. */
  demoteBelow: number;
}

/** Which content a stage trains and how it is practised. Language modules fill this in. */
export interface StageSession {
  /** The learning skill the attempts are recorded against. */
  skill: SkillId;
  /** The exercise used to practise it. */
  type: ActivityType;
  /** The content item type practised. */
  itemType: string;
  /** Optional filter on `item.data` fields, e.g. `{ partOfSpeech: "expression" }`. */
  dataEquals?: Readonly<Record<string, string>>;
  /** The items carry their own answer options (a comprehension question), so none are drawn from other items. */
  ownOptions?: boolean;
}

export interface PracticeStageSpec {
  id: string;
  /** What the stage works on, e.g. "character", "word", "sentence". Localized by the UI. */
  focus: string;
  /** A stage that is not built yet is listed as planned and never offered. */
  availability: "available" | "planned";
  requirement: StageRequirement;
  /** Absent for planned stages. */
  session?: StageSession;
}

export interface PracticeSkillSpec {
  id: string;
  capability: Capability;
  /** Ordered from least to most complex. */
  stages: PracticeStageSpec[];
}

export interface PracticeFrameworkSpec {
  skills: PracticeSkillSpec[];
}

/** One attempt as the engine sees it. */
export interface StageAttempt {
  stageId: string;
  score: number;
  at: Date;
}

export type StageStatus =
  /** Not built yet. */
  | "planned"
  /** An earlier stage has to be passed first. */
  | "locked"
  /** Where the learner works now. */
  | "current"
  /** Enough recent evidence at the pass level. */
  | "passed"
  /** Judged, and recent performance is below the demotion level. */
  | "needs_work";

export interface StageProgress {
  stageId: string;
  status: StageStatus;
  attempts: number;
  /** Mean score of the latest `window` attempts; null until `minAttempts` is reached. */
  mastery: number | null;
}

/** Why the engine chose the next stage, so a recommendation can always be explained. */
export type PracticeReason =
  /** No evidence yet. */
  | "start"
  /** Keep working on the current stage. */
  | "continue"
  /** The previous stage was passed, so this one is next. */
  | "advance"
  /** Recent performance was weak, so the learner goes back one stage first. */
  | "regress"
  /** Weak on the first stage: practise it again. */
  | "retry"
  /** Every available stage is passed. */
  | "mastered";

export interface PracticeProgress {
  skillId: string;
  stages: StageProgress[];
  /** The stage to practise next. */
  nextStageId: string;
  /** 1-based position of `nextStageId` among all of the skill's stages. */
  nextStageNumber: number;
  reason: PracticeReason;
  /** The weak stage that caused a regress, if any. */
  weakStageId: string | null;
}
