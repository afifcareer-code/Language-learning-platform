import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * SQLite / libSQL schema. This is the reference schema: the MySQL and
 * PostgreSQL schemas mirror it table for table and column for column
 * (enforced by tests/unit/schema-parity.test.ts).
 *
 * Language-specific attributes live in `content_items.data` (JSON) and are
 * typed by the owning language module. Defaults are applied by the app,
 * not the database, so behaviour is identical on every dialect.
 */

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = (name = "created_at") =>
  timestamp(name)
    .notNull()
    .$defaultFn(() => new Date());

export const languages = sqliteTable("languages", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  nativeName: text("native_name").notNull(),
});

export const learners = sqliteTable("learners", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  targetLanguage: text("target_language")
    .notNull()
    .references(() => languages.code),
  createdAt: createdAt(),
});

export const contentItems = sqliteTable(
  "content_items",
  {
    id: text("id").primaryKey(),
    languageCode: text("language_code")
      .notNull()
      .references(() => languages.code),
    type: text("type").notNull(),
    key: text("key").notNull(),
    data: text("data", { mode: "json" }).$type<unknown>().notNull(),
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("content_items_language_key").on(t.languageCode, t.key),
    index("content_items_type").on(t.type),
  ],
);

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  languageCode: text("language_code")
    .notNull()
    .references(() => languages.code),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const lessonItems = sqliteTable(
  "lesson_items",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.contentItemId] })],
);

export const learningSessions = sqliteTable("learning_sessions", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id")
    .notNull()
    .references(() => learners.id),
  mode: text("mode").notNull(),
  startedAt: createdAt("started_at"),
  endedAt: timestamp("ended_at"),
});

/** Every graded response. The raw evidence from which mastery is derived. */
export const learningAttempts = sqliteTable(
  "learning_attempts",
  {
    id: text("id").primaryKey(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => learners.id),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    skill: text("skill").notNull(),
    mode: text("mode").notNull(),
    sessionId: text("session_id").references(() => learningSessions.id),
    correct: integer("correct", { mode: "boolean" }).notNull(),
    score: real("score").notNull(),
    /** What the learner answered, for error-pattern analysis. */
    response: text("response"),
    responseMs: integer("response_ms"),
    createdAt: createdAt(),
  },
  (t) => [
    index("attempts_learner_created").on(t.learnerId, t.createdAt),
    index("attempts_learner_item").on(t.learnerId, t.contentItemId, t.skill),
  ],
);

/** Raw stroke data for handwriting attempts, kept for future re-analysis. */
export const writingSamples = sqliteTable("writing_samples", {
  attemptId: text("attempt_id")
    .primaryKey()
    .references(() => learningAttempts.id, { onDelete: "cascade" }),
  strokes: text("strokes", { mode: "json" }).$type<unknown>().notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  guidanceStage: text("guidance_stage").notNull(),
  selfAssessment: text("self_assessment").notNull(),
  analysis: text("analysis", { mode: "json" }).$type<unknown>().notNull(),
});

export const mastery = sqliteTable(
  "mastery",
  {
    learnerId: text("learner_id")
      .notNull()
      .references(() => learners.id),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    skill: text("skill").notNull(),
    state: text("state").notNull(),
    attempts: integer("attempts").notNull(),
    correct: integer("correct").notNull(),
    consecutiveCorrect: integer("consecutive_correct").notNull(),
    lastAttemptAt: timestamp("last_attempt_at"),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.contentItemId, t.skill] })],
);

export const reviewSchedule = sqliteTable(
  "review_schedule",
  {
    learnerId: text("learner_id")
      .notNull()
      .references(() => learners.id),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    skill: text("skill").notNull(),
    stage: integer("stage").notNull(),
    intervalDays: real("interval_days").notNull(),
    dueAt: timestamp("due_at").notNull(),
    lastReviewedAt: timestamp("last_reviewed_at"),
    reviews: integer("reviews").notNull(),
    lapses: integer("lapses").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.learnerId, t.contentItemId, t.skill] }),
    index("review_learner_due").on(t.learnerId, t.dueAt),
  ],
);

export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(),
  languageCode: text("language_code")
    .notNull()
    .references(() => languages.code),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  skill: text("skill").notNull(),
  selector: text("selector", { mode: "json" }).$type<unknown>().notNull(),
  questionCount: integer("question_count").notNull(),
  passThreshold: real("pass_threshold").notNull(),
});

export const assessmentAttempts = sqliteTable("assessment_attempts", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id),
  learnerId: text("learner_id")
    .notNull()
    .references(() => learners.id),
  startedAt: createdAt("started_at"),
  completedAt: timestamp("completed_at"),
});

export const assessmentResults = sqliteTable("assessment_results", {
  attemptId: text("attempt_id")
    .primaryKey()
    .references(() => assessmentAttempts.id, { onDelete: "cascade" }),
  total: integer("total").notNull(),
  correct: integer("correct").notNull(),
  score: real("score").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  missedItemIds: text("missed_item_ids", { mode: "json" }).$type<string[]>().notNull(),
});
