import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JA_SKILLS } from "@/languages/japanese";
import { prepareDatabase } from "@/server/db/bootstrap";
import { createDatabase, type Database } from "@/server/db/client";
import { listCourses } from "@/server/repositories/content";
import { ensureLocalLearner, type Learner } from "@/server/repositories/learners";
import { getLearnerProgress, getRecentAttempts, progressKey } from "@/server/repositories/progress";
import { recordAttempt } from "@/server/services/learning";
import { getLearningOverview } from "@/server/services/overview";
import { getPracticeSet } from "@/server/services/practice";
import { createTestDatabase, TEST_DIALECTS, type TestDatabase } from "./databases";

const quiet = { log: () => undefined };

describe.each(TEST_DIALECTS)("learning flow on $dialect", ({ dialect, serverUrl }) => {
  let testDb: TestDatabase;
  let db: Database;
  let learner: Learner;

  beforeAll(async () => {
    testDb = await createTestDatabase(dialect, serverUrl);
    db = createDatabase(testDb.config);
    await prepareDatabase(db, { migrate: true, seed: true, ...quiet });
    learner = await ensureLocalLearner(db, "Test");
  }, 60_000);

  afterAll(async () => {
    await db?.close();
    await testDb?.drop();
  });

  it("migrates and seeds idempotently, preserving Japanese text", async () => {
    await prepareDatabase(db, { migrate: true, seed: true, ...quiet });
    const [course] = await listCourses(db, "ja");
    expect(course?.lessons).toHaveLength(18);
    expect(course?.lessons[0]?.itemIds).toHaveLength(5);
    const set = await getPracticeSet(db, learner, JA_SKILLS.kanaReading, { lesson: "hiragana-vowels" });
    expect(set.items.map((i) => (i.data as { kana: string }).kana).sort()).toEqual([
      "あ",
      "い",
      "う",
      "え",
      "お",
    ]);
    expect(set.items[0]?.tags).toContain("hiragana");
  });

  it("recommends the first lesson to a new learner", async () => {
    const overview = await getLearningOverview(db, learner);
    expect(overview.currentLesson?.slug).toBe("hiragana-vowels");
    expect(overview.recommendations).toEqual([expect.objectContaining({ kind: "learn" })]);
  });

  it("records attempts, schedules reviews and updates mastery", async () => {
    const set = await getPracticeSet(db, learner, JA_SKILLS.kanaReading, { lesson: "hiragana-vowels" });
    const t0 = new Date("2026-01-01T09:00:00.123Z");
    const [first, second] = set.items;
    const base = { learnerId: learner.id, skill: JA_SKILLS.kanaReading, mode: "practice" as const };
    await recordAttempt(db, { ...base, contentItemId: first!.id, correct: true, score: 1, at: t0 });
    const missed = await recordAttempt(db, {
      ...base,
      contentItemId: second!.id,
      correct: false,
      score: 0,
      response: "x",
      at: t0,
    });
    expect(missed.masteryState).toBe("learning");
    expect(missed.review.stage).toBe(0);

    const progress = await getLearnerProgress(db, learner.id, t0);
    const firstProgress = progress.get(progressKey(first!.id, JA_SKILLS.kanaReading));
    expect(firstProgress?.review?.stage).toBe(1);
    // Timestamps round-trip exactly (UTC, millisecond precision) on every dialect.
    expect(firstProgress?.mastery.lastAttemptAt?.toISOString()).toBe(t0.toISOString());
    expect(firstProgress?.review?.dueAt.toISOString()).toBe("2026-01-02T09:00:00.123Z");

    const [latest] = await getRecentAttempts(db, learner.id, { limit: 1 });
    expect(typeof latest?.correct).toBe("boolean");

    const later = new Date(t0.getTime() + 2 * 24 * 60 * 60 * 1000);
    const overview = await getLearningOverview(db, learner, later);
    expect(overview.dueBySkill[JA_SKILLS.kanaReading]).toBe(2);
    expect(overview.recommendations[0]).toMatchObject({
      kind: "review",
      skill: JA_SKILLS.kanaReading,
      count: 2,
    });

    const review = await getPracticeSet(db, learner, JA_SKILLS.kanaReading, { mode: "review" }, later);
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
