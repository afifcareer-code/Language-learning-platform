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

/**
 * The language catalog: every language the platform offers or plans to offer.
 * A language is `available` only when its module is installed; others are
 * listed as `coming_soon` and cannot be studied.
 */
export const languages = pgTable("languages", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  nativeName: text("native_name").notNull(),
  status: text("status").notNull().default("available"),
  /** e.g. "kana_kanji", "latin", "hangul". */
  writingSystem: text("writing_system"),
  /** The proficiency framework its curriculum follows, e.g. "jlpt", "cefr". */
  proficiencyFramework: text("proficiency_framework"),
  sortOrder: integer("sort_order").notNull().default(0),
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

/**
 * Languages a learner studies, each with its own current level. The active
 * one is `learners.target_language`; switching keeps every language's level.
 */
export const learnerLanguages = pgTable(
  "learner_languages",
  {
    learnerId: text("learner_id")
      .notNull()
      .references(() => learners.id),
    languageCode: text("language_code")
      .notNull()
      .references(() => languages.code),
    currentLevelId: text("current_level_id")
      .notNull()
      .references(() => levels.id),
    startedAt: createdAt("started_at"),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.languageCode] })],
);

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
    /** The proficiency level the item is introduced at (e.g. JLPT N5 vocabulary); null when not tied to one. */
    levelId: text("level_id").references(() => levels.id),
  },
  (t) => [
    uniqueIndex("content_items_language_key").on(t.languageCode, t.key),
    index("content_items_type").on(t.type),
  ],
);

/**
 * Localized parts of a content item (a word's meaning, a grammar point's
 * explanation), as module-typed JSON per locale. The item itself stays in
 * the learning language.
 */
export const contentItemTranslations = pgTable(
  "content_item_translations",
  {
    contentItemId: text("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    data: jsonb("data").$type<unknown>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.contentItemId, t.locale] })],
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
  /**
   * The level's code in the language's proficiency framework (e.g. "N5");
   * null for platform stages such as Foundation that precede the framework.
   */
  frameworkLevel: text("framework_level"),
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
    /** The situation or context the lesson is set in. */
    description: text("description"),
    /** What the learner can do after the lesson; its activities' objectives contribute to it. */
    objective: text("objective"),
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
    /** The Practice stage this attempt trains, or null for Learn and review attempts. */
    practiceStage: text("practice_stage"),
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

/**
 * Optional accounts (AUTH_MODE=accounts). An account owns one learner, so all
 * learning data stays keyed by learner. Passwords are stored as scrypt hashes;
 * sessions store only a SHA-256 hash of the cookie token.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    learnerId: text("learner_id")
      .notNull()
      .references(() => learners.id),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("accounts_email").on(t.email), uniqueIndex("accounts_learner").on(t.learnerId)],
);

export const accountSessions = pgTable(
  "account_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("account_sessions_account").on(t.accountId)],
);
