import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedJapanese } from "../../database/seeders/japanese";
import { JA_SKILLS } from "@/languages/japanese";
import { createDatabase, type Database } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { listCourses } from "@/server/repositories/content";
import { ensureLocalLearner, type Learner } from "@/server/repositories/learners";
import { getLearnerProgress, progressKey } from "@/server/repositories/progress";
import { recordAttempt } from "@/server/services/learning";
import { getLearningOverview } from "@/server/services/overview";
import { getPracticeSet } from "@/server/services/practice";

let dir: string;
let db: Database;
let learner: Learner;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "llp-test-"));
  db = createDatabase(`file:${join(dir, "test.db")}`);
  await runMigrations(db);
  await seedJapanese(db, join(process.cwd(), "data"));
  learner = await ensureLocalLearner(db, "Test");
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("learning flow", () => {
  it("seeds idempotently", async () => {
    const again = await seedJapanese(db, join(process.cwd(), "data"));
    expect(again).toEqual({ items: 92, lessons: 18 });
    const [course] = await listCourses(db, "ja");
    expect(course?.lessons).toHaveLength(18);
    expect(course?.lessons[0]?.itemIds).toHaveLength(5);
  });

  it("recommends the first lesson to a new learner", async () => {
    const overview = await getLearningOverview(db, learner);
    expect(overview.currentLesson?.slug).toBe("hiragana-vowels");
    expect(overview.recommendations).toEqual([expect.objectContaining({ kind: "learn" })]);
  });

  it("records attempts, schedules reviews and updates mastery", async () => {
    const set = await getPracticeSet(db, learner, JA_SKILLS.kanaReading, { lesson: "hiragana-vowels" });
    expect(set.items).toHaveLength(5);

    const t0 = new Date("2026-01-01T09:00:00Z");
    const [first, second] = set.items;
    await recordAttempt(db, {
      learnerId: learner.id,
      contentItemId: first!.id,
      skill: JA_SKILLS.kanaReading,
      mode: "practice",
      correct: true,
      score: 1,
      at: t0,
    });
    const missed = await recordAttempt(db, {
      learnerId: learner.id,
      contentItemId: second!.id,
      skill: JA_SKILLS.kanaReading,
      mode: "practice",
      correct: false,
      score: 0,
      response: "x",
      at: t0,
    });
    expect(missed.masteryState).toBe("learning");
    expect(missed.review.stage).toBe(0);

    const progress = await getLearnerProgress(db, learner.id, t0);
    expect(progress.get(progressKey(first!.id, JA_SKILLS.kanaReading))?.review?.stage).toBe(1);

    // A day later both are due and the dashboard asks for a review first.
    const later = new Date(t0.getTime() + 2 * 24 * 60 * 60 * 1000);
    const overview = await getLearningOverview(db, learner, later);
    expect(overview.dueBySkill[JA_SKILLS.kanaReading]).toBe(2);
    expect(overview.recommendations[0]).toMatchObject({
      kind: "review",
      skill: JA_SKILLS.kanaReading,
      count: 2,
    });

    const review = await getPracticeSet(db, learner, JA_SKILLS.kanaReading, { mode: "review" }, later);
    expect(review.mode).toBe("review");
    expect(review.items.map((i) => i.id).sort()).toEqual([first!.id, second!.id].sort());
  });

  it("stores handwriting samples with writing attempts", async () => {
    const result = await recordAttempt(db, {
      learnerId: learner.id,
      contentItemId: "ja.hiragana.a",
      skill: JA_SKILLS.kanaWriting,
      mode: "practice",
      correct: true,
      score: 1,
      writingSample: {
        strokes: [{ index: 0, pointerType: "pen", points: [{ x: 0.1, y: 0.1, t: 0, pressure: 0.5 }] }],
        width: 400,
        height: 400,
        guidanceStage: "full_example",
        selfAssessment: "correct",
        analysis: { checks: [] },
      },
    });
    expect(result.masteryState).toBe("learning");
  });
});
