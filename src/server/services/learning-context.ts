import { and, eq } from "drizzle-orm";
import type { LanguageStatus } from "@/languages/catalog";
import type { Locale } from "@/localization/config";
import type { Database } from "../db/client";
import { upsert } from "../db/dialect";
import { getCurriculum } from "../repositories/curriculum";
import type { Learner } from "../repositories/learners";

/**
 * The learner's learning context: which language they are learning and at
 * which level. This is separate from the UI locale (learners.ui_locale).
 */

export interface LanguageOption {
  code: string;
  nativeName: string;
  status: LanguageStatus;
  writingSystem: string | null;
  proficiencyFramework: string | null;
}

export interface LevelOption {
  id: string;
  slug: string;
  /** Official framework code (e.g. "N5"), or null for platform stages such as Foundation. */
  frameworkLevel: string | null;
  title: string;
  description: string | null;
  /** Whether the level has curriculum yet. Levels without it cannot be chosen. */
  hasContent: boolean;
}

export interface LearningContext {
  language: LanguageOption;
  level: LevelOption;
}

export class LearningContextError extends Error {}

export async function listLanguages(db: Database): Promise<LanguageOption[]> {
  const t = db.t.languages;
  const rows = await db.select().from(t).orderBy(t.sortOrder);
  return rows.map((r) => ({
    code: r.code,
    nativeName: r.nativeName,
    status: r.status === "available" ? "available" : "coming_soon",
    writingSystem: r.writingSystem,
    proficiencyFramework: r.proficiencyFramework,
  }));
}

export async function listLevels(db: Database, languageCode: string, locale: Locale): Promise<LevelOption[]> {
  const t = db.t.levels;
  const [rows, curriculum] = await Promise.all([
    db.select().from(t).where(eq(t.languageCode, languageCode)).orderBy(t.sortOrder),
    getCurriculum(db, languageCode, locale),
  ]);
  return rows.map((r) => {
    const view = curriculum.levels.find((l) => l.id === r.id);
    return {
      id: r.id,
      slug: r.slug,
      frameworkLevel: r.frameworkLevel,
      title: view?.title ?? r.slug,
      description: view?.description ?? null,
      hasContent: Boolean(view?.courses.some((c) => c.lessons.length > 0)),
    };
  });
}

/** The levels-per-language a learner has started. */
export async function listLearnerLanguages(db: Database, learnerId: string) {
  const t = db.t.learnerLanguages;
  return db.select().from(t).where(eq(t.learnerId, learnerId));
}

async function hasProgressIn(db: Database, learnerId: string, languageCode: string): Promise<boolean> {
  const { learningAttempts: a, contentItems: c } = db.t;
  const [row] = await db
    .select({ id: a.id })
    .from(a)
    .innerJoin(c, eq(c.id, a.contentItemId))
    .where(and(eq(a.learnerId, learnerId), eq(c.languageCode, languageCode)))
    .limit(1);
  return Boolean(row);
}

/**
 * The learner's current language and level, or null when they still need to
 * choose (new learners). Learners from before language selection existed,
 * who already have progress, are placed at the first level with content
 * instead of being sent back through onboarding.
 */
export async function getLearningContext(
  db: Database,
  learner: Learner,
  locale: Locale,
): Promise<LearningContext | null> {
  const language = (await listLanguages(db)).find((l) => l.code === learner.targetLanguage);
  if (!language || language.status !== "available") return null;

  const t = db.t.learnerLanguages;
  let [row] = await db
    .select()
    .from(t)
    .where(and(eq(t.learnerId, learner.id), eq(t.languageCode, language.code)))
    .limit(1);
  const levels = await listLevels(db, language.code, locale);

  if (!row) {
    const firstWithContent = levels.find((l) => l.hasContent);
    if (!firstWithContent || !(await hasProgressIn(db, learner.id, language.code))) return null;
    const created = {
      learnerId: learner.id,
      languageCode: language.code,
      currentLevelId: firstWithContent.id,
    };
    await upsert(db, db, t, created, {
      target: [t.learnerId, t.languageCode],
      set: { currentLevelId: firstWithContent.id },
    });
    [row] = await db
      .select()
      .from(t)
      .where(and(eq(t.learnerId, learner.id), eq(t.languageCode, language.code)))
      .limit(1);
  }

  const level = levels.find((l) => l.id === row?.currentLevelId);
  return level ? { language, level } : null;
}

/**
 * Start (or switch to) learning a language at a level. Only available
 * languages and levels that have curriculum can be chosen.
 */
export async function startLearning(
  db: Database,
  learner: Learner,
  languageCode: string,
  levelSlug: string,
  locale: Locale,
): Promise<void> {
  const language = (await listLanguages(db)).find((l) => l.code === languageCode);
  if (!language || language.status !== "available") {
    throw new LearningContextError(`Language "${languageCode}" is not available yet`);
  }
  const level = (await listLevels(db, languageCode, locale)).find((l) => l.slug === levelSlug);
  if (!level) throw new LearningContextError(`Unknown level "${levelSlug}"`);
  if (!level.hasContent) throw new LearningContextError(`Level "${levelSlug}" has no curriculum yet`);

  const t = db.t.learnerLanguages;
  await db.transaction(async (tx) => {
    await upsert(
      db,
      tx,
      t,
      { learnerId: learner.id, languageCode, currentLevelId: level.id },
      {
        target: [t.learnerId, t.languageCode],
        set: { currentLevelId: level.id },
      },
    );
    await tx
      .update(db.t.learners)
      .set({ targetLanguage: languageCode })
      .where(eq(db.t.learners.id, learner.id));
  });
}

/** Switch the active learning language to one the learner has already started. */
export async function resumeLanguage(db: Database, learner: Learner, languageCode: string): Promise<boolean> {
  const started = (await listLearnerLanguages(db, learner.id)).some((r) => r.languageCode === languageCode);
  if (!started) return false;
  await db
    .update(db.t.learners)
    .set({ targetLanguage: languageCode })
    .where(eq(db.t.learners.id, learner.id));
  return true;
}
