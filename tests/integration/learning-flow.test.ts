import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JA_SKILLS } from "@/languages/japanese";
import { prepareDatabase } from "@/server/db/bootstrap";
import { createDatabase, type Database } from "@/server/db/client";
import { migrationsFolder, runMigrations } from "@/server/db/migrate";
import { getCurriculum } from "@/server/repositories/curriculum";
import { ensureLocalLearner, type Learner } from "@/server/repositories/learners";
import { getConfusionPairs, getLearnerProgress, progressKey } from "@/server/repositories/progress";
import { recordAttempt } from "@/server/services/learning";
import { getLearningOverview } from "@/server/services/overview";
import { getPracticeSession } from "@/server/services/practice";
import {
  getLearningContext,
  LearningContextError,
  listLanguages,
  listLearnerLanguages,
  listLevels,
  startLearning,
} from "@/server/services/learning-context";
import { createTestDatabase, TEST_DIALECTS, type TestDatabase } from "./databases";

const quiet = { log: () => undefined };

/** Run raw SQL on any dialect. */
async function exec(db: Database, query: ReturnType<typeof sql>) {
  const anyDb = db as unknown as {
    run?: (q: unknown) => Promise<unknown>;
    execute?: (q: unknown) => Promise<unknown>;
  };
  return db.engine === "sqlite" ? anyDb.run!(query) : anyDb.execute!(query);
}

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

  it("seeds a localized curriculum idempotently: level → course → lesson → activities", async () => {
    await prepareDatabase(db, { migrate: true, seed: true, ...quiet });
    const en = await getCurriculum(db, "ja", "en");
    const id = await getCurriculum(db, "ja", "id");
    // The JLPT path is explicit; only Foundation has curriculum so far.
    expect(en.levels.map((l) => [l.title, l.frameworkLevel])).toEqual([
      ["Foundation", null],
      ["N5", "N5"],
      ["N4", "N4"],
      ["N3", "N3"],
      ["N2", "N2"],
      ["N1", "N1"],
    ]);
    expect(id.levels[0]?.title).toBe("Dasar");
    expect(en.levels[0]?.courses.map((c) => c.title)).toEqual(["Hiragana", "Katakana"]);
    expect(en.levels.slice(1).every((l) => l.courses.length === 0)).toBe(true);
    expect(en.lessons).toHaveLength(18);
    expect(en.activities).toHaveLength(54);
    expect(en.lessons[1]?.title).toBe("Hiragana: K row");
    expect(id.lessons[1]?.title).toBe("Hiragana: Baris K");

    const write = id.activities.find((a) => a.id === "ja.activity.hiragana-vowels.writing")!;
    expect(write).toMatchObject({
      type: "writing",
      skill: JA_SKILLS.kanaWriting,
      targetMastery: "proficient",
    });
    expect(write.text.title).toBe("Menulis Hiragana あ い う え お");
    expect(write.text.objective).toContain("dari ingatan");
    expect(write.successCriteria).toContain("stroke_count");
  });

  it("starts a new learner on the first activity, with all three progress measures at zero", async () => {
    const overview = await getLearningOverview(db, learner, "en");
    expect(overview.nextActivity?.id).toBe("ja.activity.hiragana-vowels.recognition");
    expect(overview.recommendations).toEqual([expect.objectContaining({ kind: "activity" })]);
    expect(overview.courseProgress).toMatchObject({ completedActivities: 0, totalActivities: 54 });
    expect(overview.overallMastery.ratio).toBe(0);
    expect(overview.readiness).toMatchObject({ ratio: 0, isReady: false });
  });

  it("builds a recognition session with commonly confused distractors", async () => {
    const session = await getPracticeSession(db, learner, "en", {
      kind: "activity",
      activityId: "ja.activity.katakana-s-row.recognition",
    });
    expect(session?.type).toBe("recognition");
    expect(session?.prompts).toHaveLength(5);
    const shi = session!.choices["ja.katakana.shi"]!;
    expect(shi).toHaveLength(4);
    expect(shi).toContain("ja.katakana.shi");
    expect(shi).toContain("ja.katakana.tsu");
    expect(shi.every((id) => id.startsWith("ja.katakana."))).toBe(true);
  });

  it("records attempts, schedules reviews, updates mastery and links the activity", async () => {
    const t0 = new Date("2026-01-01T09:00:00.123Z");
    const base = { learnerId: learner.id, skill: JA_SKILLS.kanaReading, mode: "practice" as const };
    const first = await recordAttempt(db, {
      ...base,
      contentItemId: "ja.hiragana.a",
      activityId: "ja.activity.hiragana-vowels.recall",
      correct: true,
      score: 1,
      at: t0,
    });
    expect(first).toMatchObject({ previousMasteryState: "not_started", masteryState: "learning" });
    await recordAttempt(db, {
      ...base,
      contentItemId: "ja.hiragana.i",
      correct: false,
      score: 0,
      response: "x",
      at: t0,
    });

    const progress = await getLearnerProgress(db, learner.id, t0);
    const a = progress.get(progressKey("ja.hiragana.a", JA_SKILLS.kanaReading));
    expect(a?.review?.stage).toBe(1);
    expect(a?.mastery.lastAttemptAt?.toISOString()).toBe(t0.toISOString());
    expect(a?.review?.dueAt.toISOString()).toBe("2026-01-02T09:00:00.123Z");

    const later = new Date(t0.getTime() + 2 * 24 * 60 * 60 * 1000);
    const overview = await getLearningOverview(db, learner, "en", later);
    expect(overview.dueBySkill[JA_SKILLS.kanaReading]).toBe(2);
    expect(overview.recommendations[0]).toMatchObject({
      kind: "review",
      skill: JA_SKILLS.kanaReading,
      count: 2,
    });
    expect(overview.activityStatus.get("ja.activity.hiragana-vowels.recall")).toBe("in_progress");

    const review = await getPracticeSession(
      db,
      learner,
      "en",
      { kind: "review", skill: JA_SKILLS.kanaReading },
      later,
    );
    expect(review?.mode).toBe("review");
    expect(review?.type).toBe("recall");
    expect(review?.prompts.map((i) => i.id).sort()).toEqual(["ja.hiragana.a", "ja.hiragana.i"]);
  });

  it("detects confusion pairs, recommends targeted practice, and resolves them", async () => {
    const base = {
      learnerId: learner.id,
      skill: JA_SKILLS.kanaRecognition,
      mode: "practice" as const,
      score: 0,
    };
    const at = new Date("2026-01-03T10:00:00Z");
    for (let i = 0; i < 2; i++) {
      await recordAttempt(db, {
        ...base,
        contentItemId: "ja.katakana.tsu",
        correct: false,
        confusedWithItemId: "ja.katakana.shi",
        at,
      });
    }
    let [pair] = await getConfusionPairs(db, learner.id);
    expect(pair).toMatchObject({
      itemA: "ja.katakana.shi",
      itemB: "ja.katakana.tsu",
      errorCount: 2,
      status: "open",
    });

    const overview = await getLearningOverview(db, learner, "en", at);
    expect(overview.recommendations).toContainEqual(
      expect.objectContaining({ kind: "confusion", itemA: "ja.katakana.shi", itemB: "ja.katakana.tsu" }),
    );
    const session = await getPracticeSession(db, learner, "en", {
      kind: "confusion",
      itemA: "ja.katakana.shi",
      itemB: "ja.katakana.tsu",
    });
    expect(session?.prompts).toHaveLength(4);
    expect(session?.choices["ja.katakana.shi"]).toContain("ja.katakana.tsu");

    for (let i = 0; i < 4; i++) {
      await recordAttempt(db, {
        ...base,
        contentItemId: i % 2 ? "ja.katakana.shi" : "ja.katakana.tsu",
        correct: true,
        score: 1,
        at,
      });
    }
    [pair] = await getConfusionPairs(db, learner.id);
    expect(pair?.status).toBe("resolved");
  });

  it("stores handwriting samples and the learner's UI language", async () => {
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

    await db
      .update(db.t.learners)
      .set({ uiLocale: "id" })
      .where(sql`${db.t.learners.id} = ${learner.id}`);
    expect((await ensureLocalLearner(db)).uiLocale).toBe("id");
  });
});

describe.each(TEST_DIALECTS)("upgrading an existing $dialect database", ({ dialect, serverUrl }) => {
  let testDb: TestDatabase;
  let db: Database;
  let tmp: string;

  beforeAll(async () => {
    testDb = await createTestDatabase(dialect, serverUrl);
    db = createDatabase(testDb.config);
    tmp = mkdtempSync(join(tmpdir(), "llp-migrations-"));
  }, 60_000);

  afterAll(async () => {
    await db?.close();
    await testDb?.drop();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("applies new migrations on top of the first release, keeping existing rows", async () => {
    // Recreate a database as the first release left it: only migration 0000 applied, with data.
    const source = migrationsFolder(dialect);
    const firstRelease = join(tmp, dialect);
    mkdirSync(join(firstRelease, "meta"), { recursive: true });
    cpSync(join(source, "0000_init.sql"), join(firstRelease, "0000_init.sql"));
    cpSync(join(source, "meta", "0000_snapshot.json"), join(firstRelease, "meta", "0000_snapshot.json"));
    const journal = JSON.parse(readFileSync(join(source, "meta", "_journal.json"), "utf8"));
    writeFileSync(
      join(firstRelease, "meta", "_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }),
    );
    await runMigrations(db, firstRelease);

    await exec(db, sql`INSERT INTO languages (code, name, native_name) VALUES ('ja', 'Japanese', '日本語')`);
    await exec(
      db,
      sql`INSERT INTO courses (id, language_code, slug, title, description, sort_order) VALUES ('ja.course.kana-foundations', 'ja', 'kana-foundations', 'Kana Foundations', 'Old', 0)`,
    );
    await exec(
      db,
      sql`INSERT INTO lessons (id, course_id, slug, title, sort_order) VALUES ('ja.lesson.hiragana-vowels', 'ja.course.kana-foundations', 'hiragana-vowels', 'Hiragana: Vowels', 0)`,
    );

    // What the server does on startup after the update.
    await prepareDatabase(db, { migrate: true, seed: true, ...quiet });

    const curriculum = await getCurriculum(db, "ja", "id");
    expect(curriculum.lessons[0]).toMatchObject({
      id: "ja.lesson.hiragana-vowels",
      title: "Hiragana: Vokal",
    });
    // The old single course was replaced by Hiragana and Katakana; its lesson moved, nothing was lost.
    expect(curriculum.levels[0]?.courses.map((c) => c.id)).toEqual([
      "ja.course.hiragana",
      "ja.course.katakana",
    ]);
  });

  it("upgrades a database from the previous release and keeps the learner's progress and context", async () => {
    // Previous release: migrations up to 0002, kana in one course, a learner with attempts, no learning context.
    const fresh = await createTestDatabase(dialect, serverUrl);
    const old = createDatabase(fresh.config);
    try {
      const source = migrationsFolder(dialect);
      const previous = join(tmp, `${dialect}-previous`);
      mkdirSync(join(previous, "meta"), { recursive: true });
      const journal = JSON.parse(readFileSync(join(source, "meta", "_journal.json"), "utf8"));
      const entries = journal.entries.slice(0, 3);
      for (const e of entries) {
        cpSync(join(source, `${e.tag}.sql`), join(previous, `${e.tag}.sql`));
        cpSync(
          join(source, "meta", `${String(e.idx).padStart(4, "0")}_snapshot.json`),
          join(previous, "meta", `${String(e.idx).padStart(4, "0")}_snapshot.json`),
        );
      }
      writeFileSync(join(previous, "meta", "_journal.json"), JSON.stringify({ ...journal, entries }));
      await runMigrations(old, previous);

      const at = {
        sqlite: sql`1767225600000`,
        mysql: sql`'2026-01-01 00:00:00.000'`,
        postgres: sql`'2026-01-01T00:00:00Z'`,
      }[dialect];
      await exec(
        old,
        sql`INSERT INTO languages (code, name, native_name) VALUES ('ja', 'Japanese', '日本語')`,
      );
      await exec(
        old,
        sql`INSERT INTO learners (id, display_name, target_language, created_at) VALUES ('local', 'Aiko', 'ja', ${at})`,
      );
      await exec(
        old,
        sql`INSERT INTO content_items (id, language_code, type, ${sql.identifier("key")}, data, tags, sort_order) VALUES ('ja.hiragana.a', 'ja', 'ja.kana', 'hiragana:あ', '{"script":"hiragana","kana":"あ","romaji":"a","row":"a","strokeCount":3}', '[]', 0)`,
      );
      await exec(
        old,
        sql`INSERT INTO levels (id, language_code, slug, sort_order) VALUES ('ja.level.foundation', 'ja', 'foundation', 0)`,
      );
      await exec(
        old,
        sql`INSERT INTO courses (id, language_code, level_id, slug, sort_order) VALUES ('ja.course.kana-foundations', 'ja', 'ja.level.foundation', 'kana-foundations', 0)`,
      );
      await exec(
        old,
        sql`INSERT INTO lessons (id, course_id, slug, sort_order) VALUES ('ja.lesson.hiragana-vowels', 'ja.course.kana-foundations', 'hiragana-vowels', 0)`,
      );
      await exec(
        old,
        sql`INSERT INTO learning_attempts (id, learner_id, content_item_id, skill, mode, correct, score, created_at) VALUES ('attempt-1', 'local', 'ja.hiragana.a', 'ja.kana.reading', 'practice', ${dialect === "postgres" ? sql`true` : sql`1`}, 1, ${at})`,
      );

      await prepareDatabase(old, { migrate: true, seed: true, ...quiet });

      const learner = await ensureLocalLearner(old);
      expect(learner.displayName).toBe("Aiko");
      const progress = await getLearnerProgress(old, learner.id);
      const attempts = await old.select().from(old.t.learningAttempts);
      expect(attempts.map((a) => a.id)).toEqual(["attempt-1"]);
      expect(progress.size).toBe(0); // the old attempt predates mastery records it may have had; it is kept as evidence

      // Existing learners with progress are not sent back through onboarding.
      const context = await getLearningContext(old, learner, "en");
      expect(context).toMatchObject({
        language: { code: "ja", status: "available" },
        level: { slug: "foundation" },
      });

      const curriculum = await getCurriculum(old, "ja", "en");
      expect(curriculum.levels[0]?.courses.map((c) => c.id)).toEqual([
        "ja.course.hiragana",
        "ja.course.katakana",
      ]);
      expect(curriculum.lessons[0]?.id).toBe("ja.lesson.hiragana-vowels");
    } finally {
      await old.close();
      await fresh.drop();
    }
  }, 60_000);
});

describe.each(TEST_DIALECTS)("choosing what to learn on $dialect", ({ dialect, serverUrl }) => {
  let testDb: TestDatabase;
  let db: Database;
  let learner: Learner;

  beforeAll(async () => {
    testDb = await createTestDatabase(dialect, serverUrl);
    db = createDatabase(testDb.config);
    await prepareDatabase(db, { migrate: true, seed: true, ...quiet });
    learner = await ensureLocalLearner(db, "New");
  }, 60_000);

  afterAll(async () => {
    await db?.close();
    await testDb?.drop();
  });

  it("lists the catalog: Japanese available, six languages coming soon", async () => {
    const languages = await listLanguages(db);
    expect(languages.map((l) => [l.code, l.status, l.proficiencyFramework])).toEqual([
      ["ja", "available", "jlpt"],
      ["en", "coming_soon", "cefr"],
      ["zh", "coming_soon", "hsk"],
      ["es", "coming_soon", "cefr"],
      ["de", "coming_soon", "cefr"],
      ["fr", "coming_soon", "cefr"],
      ["ko", "coming_soon", "topik"],
    ]);
  });

  it("lists Japanese levels along JLPT, with only Foundation open", async () => {
    const levels = await listLevels(db, "ja", "id");
    expect(levels.map((l) => [l.slug, l.frameworkLevel, l.hasContent])).toEqual([
      ["foundation", null, true],
      ["n5", "N5", false],
      ["n4", "N4", false],
      ["n3", "N3", false],
      ["n2", "N2", false],
      ["n1", "N1", false],
    ]);
    expect(levels[0]?.title).toBe("Dasar");
  });

  it("asks a new learner to choose, then remembers the language and level", async () => {
    expect(await getLearningContext(db, learner, "en")).toBeNull();
    await startLearning(db, learner, "ja", "foundation", "en");
    const updated = await ensureLocalLearner(db);
    expect(updated.targetLanguage).toBe("ja");
    expect(await getLearningContext(db, updated, "en")).toMatchObject({
      language: { code: "ja" },
      level: { slug: "foundation", title: "Foundation" },
    });
    expect((await listLearnerLanguages(db, learner.id)).map((r) => r.languageCode)).toEqual(["ja"]);
  });

  it("does not start coming-soon languages or levels without curriculum", async () => {
    await expect(startLearning(db, learner, "en", "a1", "en")).rejects.toBeInstanceOf(LearningContextError);
    await expect(startLearning(db, learner, "ja", "n3", "en")).rejects.toThrow(/no curriculum/);
    await expect(startLearning(db, learner, "ja", "missing", "en")).rejects.toThrow(/Unknown level/);
    expect((await ensureLocalLearner(db)).targetLanguage).toBe("ja");
  });

  it("scopes the dashboard to the current level", async () => {
    const context = (await getLearningContext(db, await ensureLocalLearner(db), "en"))!;
    const overview = await getLearningOverview(db, learner, "en", new Date(), context.level.id);
    expect(overview.courseProgress.totalActivities).toBe(54);
    expect(overview.nextActivity?.id).toBe("ja.activity.hiragana-vowels.recognition");
  });
});
