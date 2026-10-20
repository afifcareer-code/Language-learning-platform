import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp as pgTimestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * PostgreSQL schema. Mirrors ./sqlite.ts table for table and column for column;
 * see that file for documentation. Keep the three schemas in sync
 * (enforced by tests/unit/schema-parity.test.ts).
 */

const timestamp = (name: string) => pgTimestamp(name, { mode: "date", withTimezone: true, precision: 3 });
const createdAt = (name = "created_at") =>
  timestamp(name)
    .notNull()
    .$defaultFn(() => new Date());

export const languages = pgTable("languages", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  nativeName: text("native_name").notNull(),
});

export const learners = pgTable("learners", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  targetLanguage: text("target_language")
    .notNull()
    .references(() => languages.code),
  /** Preferred platform (UI) locale; null means "use the browser's language". */
  uiLocale: text("ui_locale"),
  createdAt: createdAt(),
});

export const contentItems = pgTable(
  "content_items",
  {
    id: text("id").primaryKey(),
    languageCode: text("language_code")
      .notNull()
      .references(() => languages.code),
    type: text("type").notNull(),
    key: text("key").notNull(),
    data: jsonb("data").$type<unknown>().notNull(),
    tags: jsonb("tags")
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

/*
 * Curriculum: Language → Level → Course → Lesson → Activity.
 * Localized text lives in *_translations tables keyed by (entity, locale),
 * so adding a locale never changes the schema.
 */

/** A proficiency band within a language, e.g. a foundation level or a framework level. */
export const levels = pgTable("levels", {
  id: text("id").primaryKey(),
  languageCode: text("language_code")
    .notNull()
    .references(() => languages.code),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull(),
});

export const levelTranslations = pgTable(
  "level_translations",
  {
    levelId: text("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description"),
  },
  (t) => [primaryKey({ columns: [t.levelId, t.locale] })],
);

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  languageCode: text("language_code")
    .notNull()
    .references(() => languages.code),
  levelId: text("level_id").references(() => levels.id),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const courseTranslations = pgTable(
  "course_translations",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description"),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.locale] })],
);

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull(),
});

export const lessonTranslations = pgTable(
  "lesson_translations",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    description: text("description"),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.locale] })],
);

export const lessonItems = pgTable(
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

/** A measurable learning action: objective, skill, content and evaluation. */
export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    languageCode: text("language_code")
      .notNull()
      .references(() => languages.code),
    lessonId: text("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    skill: text("skill").notNull(),
    difficulty: integer("difficulty").notNull(),
    evaluation: text("evaluation").notNull(),
    successCriteria: jsonb("success_criteria").$type<string[]>().notNull(),
    passScore: doublePrecision("pass_score").notNull(),
    targetMastery: text("target_mastery").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [index("activities_lesson").on(t.lessonId)],
);

export const activityItems = pgTable(
  "activity_items",
  {
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.contentItemId] })],
);

export const activityTranslations = pgTable(
  "activity_translations",
  {
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    objective: text("objective").notNull(),
    instruction: text("instruction").notNull(),
    explanation: text("explanation").notNull(),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.locale] })],
);

export const learningSessions = pgTable("learning_sessions", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id")
    .notNull()
    .references(() => learners.id),
  mode: text("mode").notNull(),
  startedAt: createdAt("started_at"),
  endedAt: timestamp("ended_at"),
});

/** Every graded response. The raw evidence from which mastery is derived. */
export const learningAttempts = pgTable(
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
    activityId: text("activity_id").references(() => activities.id, { onDelete: "set null" }),
    correct: boolean("correct").notNull(),
    score: doublePrecision("score").notNull(),
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
export const writingSamples = pgTable("writing_samples", {
  attemptId: text("attempt_id")
    .primaryKey()
    .references(() => learningAttempts.id, { onDelete: "cascade" }),
  strokes: jsonb("strokes").$type<unknown>().notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  guidanceStage: text("guidance_stage").notNull(),
  selfAssessment: text("self_assessment").notNull(),
  analysis: jsonb("analysis").$type<unknown>().notNull(),
});

export const mastery = pgTable(
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

export const reviewSchedule = pgTable(
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
    intervalDays: doublePrecision("interval_days").notNull(),
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

/** Two items a learner keeps mixing up, with remediation state. Stored with itemA < itemB. */
export const confusionPairs = pgTable(
  "confusion_pairs",
  {
    learnerId: text("learner_id")
      .notNull()
      .references(() => learners.id),
    itemA: text("item_a")
      .notNull()
      .references(() => contentItems.id),
    itemB: text("item_b")
      .notNull()
      .references(() => contentItems.id),
    errorCount: integer("error_count").notNull(),
    correctSinceError: integer("correct_since_error").notNull(),
    lastSeenAt: timestamp("last_seen_at").notNull(),
    status: text("status").notNull(),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.itemA, t.itemB] })],
);

export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  languageCode: text("language_code")
    .notNull()
    .references(() => languages.code),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  skill: text("skill").notNull(),
  selector: jsonb("selector").$type<unknown>().notNull(),
  questionCount: integer("question_count").notNull(),
  passThreshold: doublePrecision("pass_threshold").notNull(),
});

export const assessmentAttempts = pgTable("assessment_attempts", {
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

export const assessmentResults = pgTable("assessment_results", {
  attemptId: text("attempt_id")
    .primaryKey()
    .references(() => assessmentAttempts.id, { onDelete: "cascade" }),
  total: integer("total").notNull(),
  correct: integer("correct").notNull(),
  score: doublePrecision("score").notNull(),
  passed: boolean("passed").notNull(),
  missedItemIds: jsonb("missed_item_ids").$type<string[]>().notNull(),
});
