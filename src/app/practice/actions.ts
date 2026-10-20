"use server";

import { z } from "zod";
import type { MasteryState } from "@/core/mastery";
import {
  SELF_ASSESSMENTS,
  StrokeCountAnalyzer,
  WRITING_STAGES,
  scoreWriting,
  type WritingAnalysis,
} from "@/handwriting";
import { JA_SKILLS, acceptedStrokeCounts, isKanaItemData } from "@/languages/japanese";
import { getContext } from "@/server/context";
import { getContentItem } from "@/server/repositories/content";
import { evaluateTypedResponse, recordAttempt } from "@/server/services/learning";

// Server actions are public HTTP endpoints: validate every input.

const modeSchema = z.enum(["practice", "review"]);

const readingSchema = z.object({
  itemId: z.string().min(1).max(100),
  answer: z.string().max(50),
  responseMs: z.number().int().nonnegative().max(3_600_000).nullable(),
  mode: modeSchema,
});

export interface ReadingResult {
  correct: boolean;
  expected: string;
  masteryState: MasteryState;
}

export async function submitReadingAnswer(input: z.infer<typeof readingSchema>): Promise<ReadingResult> {
  const data = readingSchema.parse(input);
  const { db, learner } = await getContext();
  const item = await getContentItem(db, data.itemId);
  if (!item) throw new Error("Unknown item");

  const evaluation = evaluateTypedResponse(item, JA_SKILLS.kanaReading, data.answer);
  if (!evaluation) throw new Error("This item cannot be graded for reading");

  const result = await recordAttempt(db, {
    learnerId: learner.id,
    contentItemId: item.id,
    skill: JA_SKILLS.kanaReading,
    mode: data.mode,
    correct: evaluation.correct,
    score: evaluation.score,
    response: data.answer,
    responseMs: data.responseMs,
  });
  return {
    correct: evaluation.correct,
    expected: evaluation.expected ?? "",
    masteryState: result.masteryState,
  };
}

const pointSchema = z.object({
  x: z.number().min(-0.5).max(1.5),
  y: z.number().min(-0.5).max(1.5),
  t: z.number().nonnegative(),
  pressure: z.number().min(0).max(1).nullable(),
});

const writingSchema = z.object({
  itemId: z.string().min(1).max(100),
  mode: modeSchema,
  stage: z.enum(WRITING_STAGES),
  selfAssessment: z.enum(SELF_ASSESSMENTS),
  responseMs: z.number().int().nonnegative().max(3_600_000).nullable(),
  sample: z.object({
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
  }),
});

export interface WritingResult {
  correct: boolean;
  analysis: WritingAnalysis;
  masteryState: MasteryState;
}

const analyzer = new StrokeCountAnalyzer();

export async function submitWritingAttempt(input: z.infer<typeof writingSchema>): Promise<WritingResult> {
  const data = writingSchema.parse(input);
  const { db, learner } = await getContext();
  const item = await getContentItem(db, data.itemId);
  if (!item || !isKanaItemData(item.data)) throw new Error("Unknown item");

  // Re-run analysis on the server; the client's copy is for immediate feedback only.
  const analysis = analyzer.analyze(data.sample, {
    text: item.data.kana,
    strokeCounts: acceptedStrokeCounts(item.data),
  });
  const score = scoreWriting(analysis, data.selfAssessment);

  const result = await recordAttempt(db, {
    learnerId: learner.id,
    contentItemId: item.id,
    skill: JA_SKILLS.kanaWriting,
    mode: data.mode,
    correct: score.correct,
    score: score.score,
    response: data.selfAssessment,
    responseMs: data.responseMs,
    writingSample: {
      strokes: data.sample.strokes,
      width: data.sample.width,
      height: data.sample.height,
      guidanceStage: data.stage,
      selfAssessment: data.selfAssessment,
      analysis,
    },
  });
  return { correct: score.correct, analysis, masteryState: result.masteryState };
}
