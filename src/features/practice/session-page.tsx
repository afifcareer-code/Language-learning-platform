import { randomUUID } from "node:crypto";
import { PracticePrompt } from "@/components/learning/practice-prompt";
import { EmptyState } from "@/components/ui/empty-state";
import { writingStageFor } from "@/handwriting/guidance";
import { criterionLabel, languageName, skillLabel } from "@/localization/labels";
import type { Messages } from "@/localization/messages";
import type { Translator } from "@/localization/translator";
import type { Database } from "@/server/db/client";
import type { Learner } from "@/server/repositories/learners";
import { getContentTranslations } from "@/server/repositories/content";
import { getCurriculum, locateLesson } from "@/server/repositories/curriculum";
import { requireLearningContext } from "@/server/learning-context";
import { getLearnerProgress, progressKey } from "@/server/repositories/progress";
import type { PracticeSession as Session } from "@/server/services/practice";
import { itemDisplay, toPracticeItem, type PracticeItem } from "@/features/japanese/practice-items";
import { introductionItems } from "./introduction";
import type { IntroductionItem } from "./introduction-step";
import { PracticeSession, type ExerciseKind } from "./practice-session";

const EXERCISE: Partial<Record<Session["type"], ExerciseKind>> = {
  recognition: "recognition",
  multiple_choice: "recognition",
  reading: "recognition",
  listening: "recognition",
  recall: "recall",
  writing: "writing",
  sentence_building: "sentence",
};

/** Server-rendered frame of a practice session: objective first, then the exercise. */
export async function SessionPage({
  session,
  db,
  learner,
  t,
}: {
  session: Session;
  db: Database;
  learner: Learner;
  t: Translator<Messages>;
}) {
  const skill = skillLabel(t, session.skill);
  const { request } = session;
  const pairText =
    request.kind === "confusion"
      ? { a: itemDisplay(session.items[request.itemA]), b: itemDisplay(session.items[request.itemB]) }
      : { a: "", b: "" };

  const header = session.activity
    ? {
        eyebrow: `${t(`common.activityTypes.${session.activity.type}`)} · ${skill}`,
        title: session.activity.text.title,
        objective: session.activity.text.objective,
        instruction: session.activity.text.instruction,
        explanation: session.activity.text.explanation,
        criteria: session.activity.successCriteria.map((c) => criterionLabel(t, c)),
      }
    : {
        eyebrow: skill,
        title:
          request.kind === "confusion"
            ? t("practice.sessions.confusion", pairText)
            : t(
                request.kind === "review"
                  ? "practice.sessions.review"
                  : request.kind === "assessment"
                    ? "practice.sessions.assessment"
                    : "practice.sessions.weak",
              ),
        objective:
          request.kind === "confusion"
            ? t("practice.sessions.objectives.confusion", pairText)
            : t(
                request.kind === "review"
                  ? "practice.sessions.objectives.review"
                  : request.kind === "assessment"
                    ? "practice.sessions.objectives.assessment"
                    : "practice.sessions.objectives.weak",
              ),
        instruction: "",
        explanation: undefined,
        criteria: undefined,
      };

  // Where the learner is, kept to one line: "Japanese · Foundation · Lesson 1 · Hiragana: Vowels".
  const learning = await requireLearningContext();
  const lessonId = session.activity?.lessonId;
  const where = lessonId
    ? locateLesson(await getCurriculum(db, learner.targetLanguage, t.locale), lessonId)
    : null;
  const level = where?.level ?? learning.level;
  const context = [
    languageName(t, learning.language.code),
    level.frameworkLevel ?? level.title,
    where ? `${t("learning.lessonNumber", { n: where.number })} · ${where.lesson.title}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const kind = EXERCISE[session.type];
  const progress = kind ? await getLearnerProgress(db, learner.id) : null;
  // Meanings and translations in the learner's interface language.
  const translations = await getContentTranslations(db, Object.keys(session.items), t.locale);
  const items = session.prompts
    .map((item) =>
      toPracticeItem(item, {
        kind: kind ?? "recall",
        skill: session.skill,
        locale: t.locale,
        translation: translations.get(item.id),
        choiceItems: (session.choices[item.id] ?? [])
          .map((id) => session.items[id])
          .filter((c) => c !== undefined)
          .map((c) => ({ item: c, translation: translations.get(c.id) })),
        stage: writingStageFor(progress?.get(progressKey(item.id, session.skill))?.state ?? "not_started"),
        scriptName: (script) => t.dynamic(["ja", "scripts", script], undefined, script),
      }),
    )
    .filter((i): i is PracticeItem => i !== null);

  // Never assess a relationship the learner has not been shown: characters they have not
  // practiced in any skill are introduced (sound ↔ character) before the first question.
  const introduction: IntroductionItem[] =
    kind && kind !== "sentence" && request.kind === "activity" && session.mode === "practice"
      ? introductionItems(
          session.activity?.contentItemIds ?? [],
          items,
          new Set([...(progress?.values() ?? [])].map((p) => p.contentItemId)),
        )
      : [];

  return (
    <>
      <PracticePrompt
        context={context}
        eyebrow={header.eyebrow}
        title={header.title}
        objective={header.objective}
        criteria={header.criteria}
        explanation={header.explanation}
        labels={{
          objective: t("learning.objective"),
          criteria: t("learning.successCriteria"),
          why: t("learning.why"),
        }}
      />
      {kind && items.length ? (
        <PracticeSession
          key={randomUUID()}
          kind={kind}
          items={items}
          skill={session.skill}
          skillLabel={skill}
          activityId={session.activity?.id ?? null}
          mode={session.mode === "review" || session.mode === "assessment" ? session.mode : "practice"}
          passScore={session.passScore}
          objective={header.objective}
          instruction={header.instruction}
          introduction={introduction}
          exam={
            session.assessment
              ? {
                  timeLimitSeconds: session.assessment.timeLimitSeconds,
                  resultHref: `/proficiency?${new URLSearchParams({ level: session.assessment.level })}`,
                }
              : undefined
          }
        />
      ) : (
        <EmptyState title={t("practice.empty")} />
      )}
    </>
  );
}
