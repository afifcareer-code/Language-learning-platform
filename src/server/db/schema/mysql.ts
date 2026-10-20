import {
  boolean,
  datetime,
  double,
  index,
  int,
  json,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * MySQL / MariaDB schema. Mirrors ./sqlite.ts table for table and column for column;
 * see that file for documentation. Keep the three schemas in sync
 * (enforced by tests/unit/schema-parity.test.ts).
 */

const timestamp = (name: string) => datetime(name, { mode: "date", fsp: 3 });
// utf8mb4 index keys are limited to 767 bytes on older MySQL/MariaDB row formats.
const str = (name: string) => varchar(name, { length: 191 });
const createdAt = (name = "created_at") =>
  timestamp(name)
    .notNull()
    .$defaultFn(() => new Date());

export const languages = mysqlTable("languages", {
  code: str("code").primaryKey(),
  name: str("name").notNull(),
  nativeName: str("native_name").notNull(),
});

export const learners = mysqlTable("learners", {
  id: str("id").primaryKey(),
  displayName: str("display_name").notNull(),
  targetLanguage: str("target_language")
    .notNull()
    .references(() => languages.code),
  createdAt: createdAt(),
});

export const contentItems = mysqlTable(
  "content_items",
  {
    id: str("id").primaryKey(),
    languageCode: str("language_code")
      .notNull()
      .references(() => languages.code),
    type: str("type").notNull(),
    key: str("key").notNull(),
    data: json("data").$type<unknown>().notNull(),
    tags: json("tags")
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("content_items_language_key").on(t.languageCode, t.key),
    index("content_items_type").on(t.type),
  ],
);

export const courses = mysqlTable("courses", {
  id: str("id").primaryKey(),
  languageCode: str("language_code")
    .notNull()
    .references(() => languages.code),
  slug: str("slug").notNull().unique(),
  title: str("title").notNull(),
  description: text("description").notNull(),
  sortOrder: int("sort_order").notNull().default(0),
});

export const lessons = mysqlTable("lessons", {
  id: str("id").primaryKey(),
  courseId: str("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  slug: str("slug").notNull().unique(),
  title: str("title").notNull(),
  sortOrder: int("sort_order").notNull(),
});

export const lessonItems = mysqlTable(
  "lesson_items",
  {
    lessonId: str("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    contentItemId: str("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    sortOrder: int("sort_order").notNull(),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.contentItemId] })],
);

export const learningSessions = mysqlTable("learning_sessions", {
  id: str("id").primaryKey(),
  learnerId: str("learner_id")
    .notNull()
    .references(() => learners.id),
  mode: str("mode").notNull(),
  startedAt: createdAt("started_at"),
  endedAt: timestamp("ended_at"),
});

/** Every graded response. The raw evidence from which mastery is derived. */
export const learningAttempts = mysqlTable(
  "learning_attempts",
  {
    id: str("id").primaryKey(),
    learnerId: str("learner_id")
      .notNull()
      .references(() => learners.id),
    contentItemId: str("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    skill: str("skill").notNull(),
    mode: str("mode").notNull(),
    sessionId: str("session_id").references(() => learningSessions.id),
    correct: boolean("correct").notNull(),
    score: double("score").notNull(),
    /** What the learner answered, for error-pattern analysis. */
    response: text("response"),
    responseMs: int("response_ms"),
    createdAt: createdAt(),
  },
  (t) => [
    index("attempts_learner_created").on(t.learnerId, t.createdAt),
    index("attempts_learner_item").on(t.learnerId, t.contentItemId, t.skill),
  ],
);

/** Raw stroke data for handwriting attempts, kept for future re-analysis. */
export const writingSamples = mysqlTable("writing_samples", {
  attemptId: str("attempt_id")
    .primaryKey()
    .references(() => learningAttempts.id, { onDelete: "cascade" }),
  strokes: json("strokes").$type<unknown>().notNull(),
  width: int("width").notNull(),
  height: int("height").notNull(),
  guidanceStage: str("guidance_stage").notNull(),
  selfAssessment: str("self_assessment").notNull(),
  analysis: json("analysis").$type<unknown>().notNull(),
});

export const mastery = mysqlTable(
  "mastery",
  {
    learnerId: str("learner_id")
      .notNull()
      .references(() => learners.id),
    contentItemId: str("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    skill: str("skill").notNull(),
    state: str("state").notNull(),
    attempts: int("attempts").notNull(),
    correct: int("correct").notNull(),
    consecutiveCorrect: int("consecutive_correct").notNull(),
    lastAttemptAt: timestamp("last_attempt_at"),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.contentItemId, t.skill] })],
);

export const reviewSchedule = mysqlTable(
  "review_schedule",
  {
    learnerId: str("learner_id")
      .notNull()
      .references(() => learners.id),
    contentItemId: str("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    skill: str("skill").notNull(),
    stage: int("stage").notNull(),
    intervalDays: double("interval_days").notNull(),
    dueAt: timestamp("due_at").notNull(),
    lastReviewedAt: timestamp("last_reviewed_at"),
    reviews: int("reviews").notNull(),
    lapses: int("lapses").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.learnerId, t.contentItemId, t.skill] }),
    index("review_learner_due").on(t.learnerId, t.dueAt),
  ],
);

export const assessments = mysqlTable("assessments", {
  id: str("id").primaryKey(),
  languageCode: str("language_code")
    .notNull()
    .references(() => languages.code),
  slug: str("slug").notNull().unique(),
  title: str("title").notNull(),
  skill: str("skill").notNull(),
  selector: json("selector").$type<unknown>().notNull(),
  questionCount: int("question_count").notNull(),
  passThreshold: double("pass_threshold").notNull(),
});

export const assessmentAttempts = mysqlTable("assessment_attempts", {
  id: str("id").primaryKey(),
  assessmentId: str("assessment_id")
    .notNull()
    .references(() => assessments.id),
  learnerId: str("learner_id")
    .notNull()
    .references(() => learners.id),
  startedAt: createdAt("started_at"),
  completedAt: timestamp("completed_at"),
});

export const assessmentResults = mysqlTable("assessment_results", {
  attemptId: str("attempt_id")
    .primaryKey()
    .references(() => assessmentAttempts.id, { onDelete: "cascade" }),
  total: int("total").notNull(),
  correct: int("correct").notNull(),
  score: double("score").notNull(),
  passed: boolean("passed").notNull(),
  missedItemIds: json("missed_item_ids").$type<string[]>().notNull(),
});
