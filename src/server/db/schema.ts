import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Generic, language-agnostic schema. Language-specific attributes live in
 * `content_items.data` (JSON) and are typed by the owning language module.
 */

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

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
    data: text("data", { mode: "json" }).notNull(),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
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
  startedAt: createdAt(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
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
  strokes: text("strokes", { mode: "json" }).notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  guidanceStage: text("guidance_stage").notNull(),
  selfAssessment: text("self_assessment").notNull(),
  analysis: text("analysis", { mode: "json" }).notNull(),
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
    lastAttemptAt: integer("last_attempt_at", { mode: "timestamp_ms" }),
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
    dueAt: integer("due_at", { mode: "timestamp_ms" }).notNull(),
    lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp_ms" }),
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
  selector: text("selector", { mode: "json" }).notNull(),
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
  startedAt: createdAt(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
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
