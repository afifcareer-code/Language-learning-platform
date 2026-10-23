"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { MasteryState } from "@/core/mastery";
import {
  SELF_ASSESSMENTS,
  StrokeCountAnalyzer,
  WRITING_STAGES,
  evaluateWriting,
  selfAssessmentOf,
  type WritingCheck,
  type WritingEvaluation,
} from "@/handwriting";
import { acceptedStrokeCounts, isKanaItemData } from "@/languages/japanese";
import { isPassageData, type PassageTranslation } from "@/languages/japanese/passages/schema";
import { isSentenceData } from "@/languages/japanese/sentences/schema";
import { isSituationData } from "@/languages/japanese/situations/schema";
import { isVocabularyData } from "@/languages/japanese/vocabulary/schema";
import { getLanguageModule } from "@/languages/registry";
import { choiceLabel, itemDisplay } from "@/features/japanese/practice-items";
import { SELF_WRITING_RATINGS, SELF_WRITING_SCORE } from "./self-writing";
import { getLocale } from "@/localization/server";
import { getContext } from "@/server/context";
import { getContentItem, getContentTranslations } from "@/server/repositories/content";
import { evaluateTypedResponse, recordAttempt } from "@/server/services/learning";

// Server actions are public HTTP endpoints: validate every input.

const id = z.string().min(1).max(200);

const pointSchema = z.object({
  x: z.number().min(-0.5).max(1.5),
  y: z.number().min(-0.5).max(1.5),
  t: z.number().nonnegative(),
  pressure: z.number().min(0).max(1).nullable(),
});

const sampleSchema = z.object({
  width: z.number().int().positive().max(10_000),
  height: z.number().int().positive().max(10_000),
  capturedAt: z.string().max(40),
  strokes: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        pointerType: z.enum(["pen", "touch", "mouse", "unknown"]),
        points: z.array(pointSchema).min(1).max(2000),
      }),
    )
    .min(1)
    .max(60),
});

const attemptSchema = z.object({
  itemId: id,
  skill: id,
  activityId: id.nullable(),
  mode: z.enum(["practice", "review", "assessment"]),
  /** "<practice skill>.<stage>" when the attempt belongs to Practice. */
  practiceStage: z.string().min(3).max(100).nullable().optional(),
  responseMs: z.number().int().nonnegative().max(3_600_000).nullable(),
  response: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("choice"), choiceId: id }),
    z.object({ kind: z.literal("text"), answer: z.string().max(50) }),
    // A comprehension question: the learner picks one of the item's own four options.
    z.object({ kind: z.literal("option"), index: z.number().int().min(0).max(3) }),
    // Writing a word or sentence by hand: the learner compares with the model and rates it.
    // Nothing reads the handwriting; the rating is the evidence.
    z.object({ kind: z.literal("self_writing"), rating: z.enum(SELF_WRITING_RATINGS) }),
    // Sentence building: the pieces in the order the learner arranged them.
    z.object({ kind: z.literal("sequence"), tokens: z.array(z.string().min(1).max(50)).min(1).max(30) }),
    z.object({
      kind: z.literal("writing"),
      stage: z.enum(WRITING_STAGES),
      // The learner's judgement after comparing with the model: did they write this character?
      selfAssessment: z.enum(SELF_ASSESSMENTS),
      // Measured on the learner's device against the glyph in their fonts; null when it could not be.
      shapeScore: z.number().min(0).max(1).nullable().optional(),
      sample: sampleSchema,
    }),
  ]),
});

export type AttemptInput = z.infer<typeof attemptSchema>;

export interface AttemptFeedback {
  correct: boolean;
  expected: string;
  previousMastery: MasteryState;
  mastery: MasteryState;
  nextReviewAt: string;
  /** The other item the learner's answer belongs to, when they mixed two up. */
  confusedWith: { id: string; display: string } | null;
  checks: WritingCheck[];
  /** For writing: correctness and precision, kept apart. */
  writing: WritingEvaluation | null;
}

const analyzer = new StrokeCountAnalyzer();

function practiceStageOf(language: string, ref: string) {
  const [skillId, stageId] = ref.split(".");
  return getLanguageModule(language)
    .practice?.skills.find((s) => s.id === skillId)
    ?.stages.find((st) => st.id === stageId);
}

export async function submitAttempt(input: AttemptInput): Promise<AttemptFeedback> {
  const data = attemptSchema.parse(input);
  const { db, learner } = await getContext();

  if (!getLanguageModule(learner.targetLanguage).skills.some((s) => s.id === data.skill)) {
    throw new Error("Unknown skill");
  }
  if (data.activityId) {
    const [activity] = await db
      .select({ id: db.t.activities.id })
      .from(db.t.activities)
      .where(and(eq(db.t.activities.id, data.activityId), eq(db.t.activities.skill, data.skill)))
      .limit(1);
    if (!activity) throw new Error("Unknown activity");
  }
  const item = await getContentItem(db, data.itemId);
  if (!item) throw new Error("Unknown item");
  if (data.practiceStage) {
    const stage = practiceStageOf(learner.targetLanguage, data.practiceStage);
    if (!stage || stage.session?.skill !== data.skill) throw new Error("Unknown practice stage");
  }

  let correct: boolean;
  let score: number;
  let response: string;
  let expected = "";
  let confusedWithId: string | undefined;
  let checks: WritingCheck[] = [];
  let writing: WritingEvaluation | null = null;
  let writingSample: Parameters<typeof recordAttempt>[1]["writingSample"];

  switch (data.response.kind) {
    case "choice": {
      const choice = await getContentItem(db, data.response.choiceId);
      if (!choice || choice.type !== item.type) throw new Error("Unknown choice");
      correct = choice.id === item.id;
      score = correct ? 1 : 0;
      response = choice.id;
      confusedWithId = correct ? undefined : choice.id;
      const translations = await getContentTranslations(db, [item.id], await getLocale());
      expected = choiceLabel(item, translations.get(item.id));
      break;
    }
    case "text": {
      const evaluation = evaluateTypedResponse(item, data.skill, data.response.answer);
      if (!evaluation) throw new Error("This item cannot be graded for this skill");
      ({ correct, score } = evaluation);
      response = data.response.answer;
      confusedWithId = evaluation.confusedWithItemId;
      expected = evaluation.expected ?? "";
      break;
    }
    case "self_writing": {
      if (!isVocabularyData(item.data) && !isSentenceData(item.data) && !isSituationData(item.data)) {
        throw new Error("This item cannot be written by hand yet");
      }
      const { rating } = data.response;
      expected = isVocabularyData(item.data)
        ? item.data.kana
        : isSituationData(item.data)
          ? item.data.model
          : item.data.text;
      correct = rating === "correct";
      score = SELF_WRITING_SCORE[rating];
      response = rating;
      break;
    }
    case "option": {
      if (!isPassageData(item.data)) throw new Error("This item has no answer options");
      const translations = await getContentTranslations(db, [item.id], await getLocale());
      const options = (translations.get(item.id) as PassageTranslation | undefined)?.options ?? [];
      correct = data.response.index === item.data.answer;
      score = correct ? 1 : 0;
      response = String(data.response.index);
      expected = options[item.data.answer] ?? "";
      break;
    }
    case "sequence": {
      response = data.response.tokens.join(" ");
      const evaluation = evaluateTypedResponse(item, data.skill, response);
      if (!evaluation) throw new Error("This item cannot be graded for this skill");
      ({ correct, score } = evaluation);
      expected = evaluation.expected ?? "";
      break;
    }
    case "writing": {
      // Re-run analysis on the server; the client's copy is for immediate feedback only.
      if (!isKanaItemData(item.data)) throw new Error("This item cannot be written by hand yet");
      const { sample, selfAssessment, stage, shapeScore } = data.response;
      expected = item.data.kana;
      const analysis = analyzer.analyze(sample, {
        text: item.data.kana,
        strokeCounts: acceptedStrokeCounts(item.data),
      });
      // Correctness is the learner's confirmation; stroke count is re-checked here and,
      // with the measured shape, can only lower the rating of a correct character.
      writing = evaluateWriting({
        checks: analysis.checks,
        shapeScore: shapeScore ?? null,
        self: selfAssessment,
      });
      correct = writing.characterCorrect;
      score = writing.score;
      checks = analysis.checks;
      response = writing.quality;
      writingSample = {
        strokes: sample.strokes,
        width: sample.width,
        height: sample.height,
        guidanceStage: stage,
        selfAssessment: selfAssessmentOf(writing.quality),
        // Same JSON column as before: older rows hold only `checks`.
        analysis: { ...analysis, evaluation: writing, learnerJudgement: selfAssessment },
      };
      break;
    }
  }

  const result = await recordAttempt(db, {
    learnerId: learner.id,
    contentItemId: item.id,
    skill: data.skill,
    mode: data.mode,
    activityId: data.activityId,
    practiceStage: data.practiceStage ?? null,
    correct,
    score,
    response,
    responseMs: data.responseMs,
    confusedWithItemId: confusedWithId,
    writingSample,
  });

  const confused = confusedWithId ? await getContentItem(db, confusedWithId) : null;
  return {
    correct,
    expected,
    previousMastery: result.previousMasteryState,
    mastery: result.masteryState,
    nextReviewAt: result.review.dueAt.toISOString(),
    confusedWith: confused ? { id: confused.id, display: itemDisplay(confused) } : null,
    checks,
    writing,
  };
}
