"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitAttempt, type AttemptFeedback, type AttemptInput } from "@/features/practice/actions";
import type { SessionResult } from "@/core/activities";
import { Button } from "@/components/ui/button";
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
import { WritingExercise } from "./writing-exercise";

export type ExerciseKind = "recognition" | "recall" | "writing" | "sentence";

export interface PracticeSessionProps {
  kind: ExerciseKind;
  items: PracticeItem[];
  skill: string;
  skillLabel: string;
  activityId: string | null;
  mode: "practice" | "review";
  passScore: number;
  objective: string;
  instruction: string;
  /**
   * Characters the learner has never practiced, to be introduced (sound and
   * character together) before the first question. Empty when there is nothing new.
   */
  introduction?: IntroductionItem[];
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
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  // Bumped when the learner writes the same character again, so the writing area starts clean.
  const [attempt, setAttempt] = useState(0);
  const [introduced, setIntroduced] = useState(!props.introduction?.length);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const elapsed = useStopwatch(index);
  const item = items[index];

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
      <SessionOutcome
        results={results}
        passScore={props.passScore}
        objective={props.objective}
        skillLabel={props.skillLabel}
        displayOf={Object.fromEntries(items.map((i) => [i.id, i.speech]))}
        displayLang="ja"
      />
    );
  }

  /** `retry`: record the attempt but stay on this item (a character that was not right is written again). */
  function submit(response: AttemptInput["response"], options: { retry?: boolean } = {}) {
    if (!item) return;
    const responseMs = elapsed();
    startTransition(async () => {
      try {
        const fb = await submitAttempt({ itemId: item.id, skill, activityId, mode, responseMs, response });
        if (options.retry) setAttempt((a) => a + 1);
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
    <div className={kind === "writing" ? "mx-auto max-w-5xl" : "mx-auto max-w-xl"}>
      <SessionProgress
        index={index}
        total={items.length}
        label={t("practice.progress", { current: index + 1, total: items.length })}
      />

      {kind === "writing" ? (
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
          {kind === "recognition" ? (
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
