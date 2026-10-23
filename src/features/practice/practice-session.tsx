"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { submitAttempt, type AttemptFeedback, type AttemptInput } from "@/features/practice/actions";
import type { SessionResult } from "@/core/activities";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SelfAssessment } from "@/handwriting/scoring/score";
import type { WritingSample } from "@/handwriting/strokes/types";
import { useT } from "@/localization/client";
import { useStopwatch } from "@/shared/use-stopwatch";
import type { PracticeItem } from "@/features/japanese/practice-items";
import { FeedbackPanel } from "./feedback-panel";
import { IntroductionStep, type IntroductionItem } from "./introduction-step";
import { RecallExercise } from "./recall-exercise";
import { SentenceExercise } from "./sentence-exercise";
import { RecognitionExercise } from "./recognition-exercise";
import { SessionOutcome } from "./session-outcome";
import { SessionProgress } from "./session-progress";
import { ComprehensionExercise } from "./comprehension-exercise";
import { TextWritingExercise } from "./text-writing-exercise";
import { WritingExercise } from "./writing-exercise";

export type ExerciseKind =
  "recognition" | "recall" | "writing" | "sentence" | "textwriting" | "comprehension";

export interface PracticeSessionProps {
  kind: ExerciseKind;
  items: PracticeItem[];
  skill: string;
  skillLabel: string;
  activityId: string | null;
  /** The Practice stage ("<skill>.<stage>") when this session trains one. */
  practiceStage?: string | null;
  mode: "practice" | "review" | "assessment";
  passScore: number;
  objective: string;
  instruction: string;
  /**
   * Characters the learner has never practiced, to be introduced (sound and
   * character together) before the first question. Empty when there is nothing new.
   */
  introduction?: IntroductionItem[];
  /**
   * Exam conditions (mock assessment): no answer feedback until the end, an optional
   * countdown, and a link to the result. Unanswered questions count as wrong.
   */
  exam?: { timeLimitSeconds: number | null; resultHref: string };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Runs a session: one prompt at a time, immediate feedback, and a learning
 * outcome at the end. The exercise component depends on the activity type;
 * everything else is shared.
 */
export function PracticeSession(props: PracticeSessionProps) {
  const { kind, items, skill, activityId, mode } = props;
  const t = useT();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [placed, setPlaced] = useState<number[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [chosenOption, setChosenOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  // Bumped when the learner writes the same character again, so the writing area starts clean.
  const [attempt, setAttempt] = useState(0);
  const [introduced, setIntroduced] = useState(!props.introduction?.length);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const elapsed = useStopwatch(index);
  const exam = props.exam;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(exam?.timeLimitSeconds ?? null);
  const timeUp = secondsLeft !== null && secondsLeft <= 0;
  const item = timeUp ? undefined : items[index];

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0 || index >= items.length) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, index, items.length]);

  if (!introduced && props.introduction) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <IntroductionStep items={props.introduction} onDone={() => setIntroduced(true)} />
        </Card>
      </div>
    );
  }

  if (!item) {
    return (
      <>
        {exam && (
          <div className="mx-auto mb-4 flex max-w-2xl flex-col gap-2">
            {timeUp && <p role="status">{t("practice.exam.timeUp")}</p>}
            <ButtonLink href={exam.resultHref}>{t("practice.exam.seeResult")}</ButtonLink>
          </div>
        )}
        <SessionOutcome
          results={results}
          passScore={props.passScore}
          objective={props.objective}
          skillLabel={props.skillLabel}
          displayOf={Object.fromEntries(items.map((i) => [i.id, i.speech]))}
          displayLang="ja"
        />
      </>
    );
  }

  /** `retry`: record the attempt but stay on this item (a character that was not right is written again). */
  function submit(response: AttemptInput["response"], options: { retry?: boolean } = {}) {
    if (!item) return;
    const responseMs = elapsed();
    startTransition(async () => {
      try {
        const fb = await submitAttempt({
          itemId: item.id,
          skill,
          activityId,
          practiceStage: props.practiceStage ?? null,
          mode,
          responseMs,
          response,
        });
        if (options.retry) setAttempt((a) => a + 1);
        else if (exam) next();
        else setFeedback(fb);
        setResults((r) => [
          ...r,
          {
            contentItemId: item.id,
            correct: fb.correct,
            before: fb.previousMastery,
            after: fb.mastery,
            nextReviewAt: new Date(fb.nextReviewAt),
          },
        ]);
        setError(null);
      } catch {
        setError(t("practice.feedback.saveError"));
      }
    });
  }

  function next() {
    setIndex((i) => i + 1);
    setAnswer("");
    setPlaced([]);
    setChosen(null);
    setChosenOption(null);
    setFeedback(null);
    setAttempt(0);
  }

  function onRecallSubmit(e: FormEvent) {
    e.preventDefault();
    if (feedback) return next();
    if (answer.trim()) submit({ kind: "text", answer });
  }

  const nextButton = feedback && (
    <Button onClick={next} autoFocus className="w-full">
      {t("common.actions.next")}
    </Button>
  );

  return (
    <div className={kind === "writing" || kind === "textwriting" ? "mx-auto max-w-5xl" : "mx-auto max-w-xl"}>
      {exam && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p>{t("practice.exam.conditions")}</p>
          {secondsLeft !== null && (
            <p role="timer" aria-live="off" className="font-semibold text-ink">
              {t("practice.exam.timeLeft", { time: formatTime(Math.max(0, secondsLeft)) })}
            </p>
          )}
        </div>
      )}
      <SessionProgress
        index={index}
        total={items.length}
        label={t("practice.progress", { current: index + 1, total: items.length })}
      />

      {kind === "textwriting" ? (
        !feedback ? (
          <TextWritingExercise
            key={`${item.id}-${index}`}
            item={item}
            disabled={pending}
            onSubmit={(rating) => submit({ kind: "self_writing", rating })}
          />
        ) : (
          <Card className="mx-auto flex max-w-xl flex-col gap-4">
            <FeedbackPanel feedback={feedback} item={item} />
            {nextButton}
          </Card>
        )
      ) : kind === "writing" ? (
        <>
          {!feedback ? (
            <WritingExercise
              key={`${item.id}-${index}-${attempt}`}
              item={item}
              instruction={props.instruction}
              disabled={pending}
              onSubmit={(
                sample: WritingSample,
                self: SelfAssessment,
                shapeScore: number | null,
                retry: boolean,
              ) =>
                submit(
                  { kind: "writing", sample, selfAssessment: self, shapeScore, stage: item.stage },
                  { retry },
                )
              }
            />
          ) : (
            <Card className="mx-auto flex max-w-xl flex-col gap-4">
              <FeedbackPanel feedback={feedback} item={item} />
              {nextButton}
            </Card>
          )}
        </>
      ) : (
        <Card className="text-center">
          {kind === "comprehension" ? (
            <ComprehensionExercise
              key={`${item.id}-${index}`}
              item={item}
              feedback={feedback}
              chosen={chosenOption}
              disabled={pending}
              onChoose={(optionIndex) => {
                setChosenOption(optionIndex);
                submit({ kind: "option", index: optionIndex });
              }}
            />
          ) : kind === "recognition" ? (
            <RecognitionExercise
              key={`${item.id}-${index}`}
              item={item}
              instruction={props.instruction}
              feedback={feedback}
              chosen={chosen}
              disabled={pending}
              onChoose={(choiceId) => {
                setChosen(choiceId);
                submit({ kind: "choice", choiceId });
              }}
            />
          ) : kind === "sentence" ? (
            <SentenceExercise
              item={item}
              instruction={props.instruction}
              placed={placed}
              feedback={feedback}
              onPlace={(index) => setPlaced((p) => [...p, index])}
              onRemove={(position) => setPlaced((p) => p.filter((_, i) => i !== position))}
            />
          ) : (
            <form id="recall" onSubmit={onRecallSubmit}>
              <RecallExercise
                item={item}
                instruction={props.instruction}
                answer={answer}
                feedback={feedback}
                onAnswerChange={setAnswer}
              />
            </form>
          )}
          <div className="mt-4 flex flex-col gap-4">
            {feedback && <FeedbackPanel feedback={feedback} item={item} />}
            {kind === "sentence" && !feedback && (
              <Button
                onClick={() => submit({ kind: "sequence", tokens: placed.map((i) => item.tokens[i]!) })}
                disabled={pending || placed.length !== item.tokens.length}
              >
                {t("common.actions.check")}
              </Button>
            )}
            {kind === "recall" && !feedback && (
              <Button type="submit" form="recall" disabled={pending || !answer.trim()}>
                {t("common.actions.check")}
              </Button>
            )}
            {nextButton}
          </div>
        </Card>
      )}
      {error && <p className="mt-3 text-center text-danger">{error}</p>}
    </div>
  );
}
