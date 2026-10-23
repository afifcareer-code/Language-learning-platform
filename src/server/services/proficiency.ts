import { and, eq, inArray } from "drizzle-orm";
import {
  assessReadiness,
  competencyProgress,
  prerequisiteMet,
  scoreMockAssessment,
  type AssessmentSectionSpec,
  type CompetencyProgress,
  type MockAssessmentResult,
  type PairState,
  type ProficiencyLevelSpec,
  type Readiness,
  type SectionResponse,
} from "@/core/proficiency";
import { getLanguageModule } from "@/languages/registry";
import type { Locale } from "@/localization/config";
import type { Database } from "../db/client";
import { getCurriculum, type Curriculum } from "../repositories/curriculum";
import type { Learner } from "../repositories/learners";
import { getLearnerProgress, progressKey, type ItemProgress } from "../repositories/progress";

export interface CompetencyView extends CompetencyProgress {
  title: string;
}

export interface ProficiencyView {
  level: { slug: string; title: string; frameworkLevel: string | null };
  prerequisite: { level: string; title: string; met: boolean };
  competencies: CompetencyView[];
  /** Mock assessment sections, with whether the learner has taken them. */
  assessment: {
    sections: (AssessmentSectionSpec & { available: number })[];
    result: MockAssessmentResult | null;
  };
  readiness: Readiness;
}

/** Item ids the activities of a level use for one skill: the items that skill is measured on. */
function levelItems(
  curriculum: Curriculum,
  levelSlug: string,
  skills: readonly string[],
): Map<string, string[]> {
  const level = curriculum.levels.find((l) => l.slug === levelSlug);
  const out = new Map<string, string[]>(skills.map((s) => [s, []]));
  for (const activity of level?.courses.flatMap((c) => c.lessons.flatMap((l) => l.activities)) ?? []) {
    if (!out.has(activity.skill)) continue;
    const ids = out.get(activity.skill)!;
    for (const id of activity.contentItemIds) if (!ids.includes(id)) ids.push(id);
  }
  return out;
}

function pairStates(
  items: Map<string, string[]>,
  skills: readonly string[],
  progress: Map<string, ItemProgress>,
): PairState[] {
  return skills.flatMap((skill) =>
    (items.get(skill) ?? []).map((id) => progress.get(progressKey(id, skill))?.state ?? "not_started"),
  );
}

/** The items a mock assessment section may draw from. */
export function sectionItemIds(curriculum: Curriculum, levelSlug: string, skill: string): string[] {
  return levelItems(curriculum, levelSlug, [skill]).get(skill) ?? [];
}

/**
 * The learner's most recent mock assessment: the latest `questionCount`
 * assessment attempts of each section. Unanswered questions count as wrong, so a
 * partial sitting cannot pass. Null when no section has been attempted.
 */
async function latestMockAssessment(
  db: Database,
  learner: Learner,
  spec: ProficiencyLevelSpec,
): Promise<MockAssessmentResult | null> {
  const t = db.t.learningAttempts;
  const skills = spec.assessment.sections.map((s) => s.skill);
  if (skills.length === 0) return null;
  const rows = await db
    .select({ item: t.contentItemId, skill: t.skill, mode: t.mode, correct: t.correct, at: t.createdAt })
    .from(t)
    .where(and(eq(t.learnerId, learner.id), inArray(t.skill, skills)))
    .orderBy(t.createdAt);

  const responses: Record<string, SectionResponse[]> = {};
  let any = false;
  for (const section of spec.assessment.sections) {
    const mine = rows.filter((r) => r.skill === section.skill);
    const taken = mine.filter((r) => r.mode === "assessment").slice(-section.questionCount);
    const list: SectionResponse[] = taken.map((r) => ({
      correct: r.correct,
      practicedBefore: mine.some((p) => p.mode !== "assessment" && p.item === r.item && p.at < r.at),
    }));
    if (list.length > 0) any = true;
    while (list.length < section.questionCount) list.push({ correct: false, practicedBefore: true });
    responses[section.id] = list;
  }
  return any ? scoreMockAssessment(spec.assessment.sections, responses, spec.thresholds) : null;
}

/** Proficiency, evidence and readiness for one level of the learner's language, derived from attempts. */
export async function getProficiency(
  db: Database,
  learner: Learner,
  locale: Locale,
  levelSlug: string,
  now = new Date(),
): Promise<ProficiencyView | null> {
  const languageModule = getLanguageModule(learner.targetLanguage);
  const spec = languageModule.proficiencyLevel?.(levelSlug) ?? null;
  if (!spec) return null;
  const curriculum = await getCurriculum(db, learner.targetLanguage, locale);
  const level = curriculum.levels.find((l) => l.slug === levelSlug);
  if (!level) return null;
  const progress = await getLearnerProgress(db, learner.id, now);

  const allSkills = [...new Set(spec.competencies.flatMap((c) => c.skills))];
  const items = levelItems(curriculum, levelSlug, allSkills);
  const competencies: CompetencyView[] = spec.competencies.map((c) => ({
    ...competencyProgress(c, pairStates(items, c.skills, progress), spec.thresholds),
    title: c.title[locale] ?? Object.values(c.title)[0] ?? c.id,
  }));

  const prerequisiteLevel = spec.prerequisiteLevel
    ? curriculum.levels.find((l) => l.slug === spec.prerequisiteLevel)
    : undefined;
  const prereqItems = spec.prerequisiteLevel
    ? levelItems(curriculum, spec.prerequisiteLevel, spec.prerequisiteSkills)
    : new Map<string, string[]>();
  const met = spec.prerequisiteLevel
    ? prerequisiteMet(pairStates(prereqItems, spec.prerequisiteSkills, progress), spec.thresholds)
    : true;

  const result = await latestMockAssessment(db, learner, spec);
  return {
    level: { slug: level.slug, title: level.title, frameworkLevel: level.frameworkLevel },
    prerequisite: {
      level: spec.prerequisiteLevel ?? "",
      title: prerequisiteLevel?.title ?? "",
      met,
    },
    competencies,
    assessment: {
      sections: spec.assessment.sections.map((s) => ({
        ...s,
        available: sectionItemIds(curriculum, levelSlug, s.skill).length,
      })),
      result,
    },
    readiness: assessReadiness({ spec, prerequisiteMet: met, competencies, mock: result }),
  };
}
