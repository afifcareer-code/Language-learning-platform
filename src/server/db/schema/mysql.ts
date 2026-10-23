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

/**
 * The language catalog: every language the platform offers or plans to offer.
 * A language is `available` only when its module is installed; others are
 * listed as `coming_soon` and cannot be studied.
 */
export const languages = mysqlTable("languages", {
  code: str("code").primaryKey(),
  name: str("name").notNull(),
  nativeName: str("native_name").notNull(),
  status: str("status").notNull().default("available"),
  /** e.g. "kana_kanji", "latin", "hangul". */
  writingSystem: str("writing_system"),
  /** The proficiency framework its curriculum follows, e.g. "jlpt", "cefr". */
  proficiencyFramework: str("proficiency_framework"),
  sortOrder: int("sort_order").notNull().default(0),
});

export const learners = mysqlTable("learners", {
  id: str("id").primaryKey(),
  displayName: str("display_name").notNull(),
  targetLanguage: str("target_language")
    .notNull()
    .references(() => languages.code),
  /** Preferred platform (UI) locale; null means "use the browser's language". */
  uiLocale: str("ui_locale"),
  createdAt: createdAt(),
});

/**
 * Languages a learner studies, each with its own current level. The active
 * one is `learners.target_language`; switching keeps every language's level.
 */
export const learnerLanguages = mysqlTable(
  "learner_languages",
  {
    learnerId: str("learner_id")
      .notNull()
      .references(() => learners.id),
    languageCode: str("language_code")
      .notNull()
      .references(() => languages.code),
    currentLevelId: str("current_level_id")
      .notNull()
      .references(() => levels.id),
    startedAt: createdAt("started_at"),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.languageCode] })],
);

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
    /** The proficiency level the item is introduced at (e.g. JLPT N5 vocabulary); null when not tied to one. */
    levelId: str("level_id").references(() => levels.id),
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
export const contentItemTranslations = mysqlTable(
  "content_item_translations",
  {
    contentItemId: str("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    locale: str("locale").notNull(),
    data: json("data").$type<unknown>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.contentItemId, t.locale] })],
);

/*
 * Curriculum: Language → Level → Course → Lesson → Activity.
 * Localized text lives in *_translations tables keyed by (entity, locale),
 * so adding a locale never changes the schema.
 */

/** A proficiency band within a language, e.g. a foundation level or a framework level. */
export const levels = mysqlTable("levels", {
  id: str("id").primaryKey(),
  languageCode: str("language_code")
    .notNull()
    .references(() => languages.code),
  slug: str("slug").notNull().unique(),
  /**
   * The level's code in the language's proficiency framework (e.g. "N5");
   * null for platform stages such as Foundation that precede the framework.
   */
  frameworkLevel: str("framework_level"),
  sortOrder: int("sort_order").notNull(),
});

export const levelTranslations = mysqlTable(
  "level_translations",
  {
    levelId: str("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    locale: str("locale").notNull(),
    title: str("title").notNull(),
    description: text("description"),
  },
  (t) => [primaryKey({ columns: [t.levelId, t.locale] })],
);

export const courses = mysqlTable("courses", {
  id: str("id").primaryKey(),
  languageCode: str("language_code")
    .notNull()
    .references(() => languages.code),
  levelId: str("level_id").references(() => levels.id),
  slug: str("slug").notNull().unique(),
  sortOrder: int("sort_order").notNull().default(0),
});

export const courseTranslations = mysqlTable(
  "course_translations",
  {
    courseId: str("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    locale: str("locale").notNull(),
    title: str("title").notNull(),
    description: text("description"),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.locale] })],
);

export const lessons = mysqlTable("lessons", {
  id: str("id").primaryKey(),
  courseId: str("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  slug: str("slug").notNull().unique(),
  sortOrder: int("sort_order").notNull(),
});

export const lessonTranslations = mysqlTable(
  "lesson_translations",
  {
    lessonId: str("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    locale: str("locale").notNull(),
    title: str("title").notNull(),
    /** The situation or context the lesson is set in. */
    description: text("description"),
    /** What the learner can do after the lesson; its activities' objectives contribute to it. */
    objective: text("objective"),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.locale] })],
);

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

/** A measurable learning action: objective, skill, content and evaluation. */
export const activities = mysqlTable(
  "activities",
  {
    id: str("id").primaryKey(),
    languageCode: str("language_code")
      .notNull()
      .references(() => languages.code),
    lessonId: str("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
    type: str("type").notNull(),
    skill: str("skill").notNull(),
    difficulty: int("difficulty").notNull(),
    evaluation: str("evaluation").notNull(),
    successCriteria: json("success_criteria").$type<string[]>().notNull(),
    passScore: double("pass_score").notNull(),
    targetMastery: str("target_mastery").notNull(),
    sortOrder: int("sort_order").notNull(),
  },
  (t) => [index("activities_lesson").on(t.lessonId)],
);

export const activityItems = mysqlTable(
  "activity_items",
  {
    activityId: str("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    contentItemId: str("content_item_id")
      .notNull()
      .references(() => contentItems.id),
    sortOrder: int("sort_order").notNull(),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.contentItemId] })],
);

export const activityTranslations = mysqlTable(
  "activity_translations",
  {
    activityId: str("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    locale: str("locale").notNull(),
    title: str("title").notNull(),
    objective: text("objective").notNull(),
    instruction: text("instruction").notNull(),
    explanation: text("explanation").notNull(),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.locale] })],
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
    activityId: str("activity_id").references(() => activities.id, { onDelete: "set null" }),
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

/** Two items a learner keeps mixing up, with remediation state. Stored with itemA < itemB. */
export const confusionPairs = mysqlTable(
  "confusion_pairs",
  {
    learnerId: str("learner_id")
      .notNull()
      .references(() => learners.id),
    itemA: str("item_a")
      .notNull()
      .references(() => contentItems.id),
    itemB: str("item_b")
      .notNull()
      .references(() => contentItems.id),
    errorCount: int("error_count").notNull(),
    correctSinceError: int("correct_since_error").notNull(),
    lastSeenAt: timestamp("last_seen_at").notNull(),
    status: str("status").notNull(),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.itemA, t.itemB] })],
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

/**
 * Optional accounts (AUTH_MODE=accounts). An account owns one learner, so all
 * learning data stays keyed by learner. Passwords are stored as scrypt hashes;
 * sessions store only a SHA-256 hash of the cookie token.
 */
export const accounts = mysqlTable(
  "accounts",
  {
    id: str("id").primaryKey(),
    learnerId: str("learner_id")
      .notNull()
      .references(() => learners.id),
    email: str("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("accounts_email").on(t.email), uniqueIndex("accounts_learner").on(t.learnerId)],
);

export const accountSessions = mysqlTable(
  "account_sessions",
  {
    tokenHash: str("token_hash").primaryKey(),
    accountId: str("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("account_sessions_account").on(t.accountId)],
);
