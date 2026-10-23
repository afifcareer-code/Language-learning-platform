"use client";

import { useEffect, useRef } from "react";
import type { AttemptFeedback } from "@/features/practice/actions";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import { PromptDisplay } from "./prompt-display";
import type { PracticeItem } from "@/features/japanese/practice-items";

/**
 * Active recall: see the item and type the answer. No options to pick from, and
 * no sound before answering when the sound is the answer (it is offered in feedback).
 */
export function RecallExercise({
  item,
  instruction,
  answer,
  feedback,
  onAnswerChange,
}: {
  item: PracticeItem;
  instruction: string;
  answer: string;
  feedback: AttemptFeedback | null;
  onAnswerChange: (value: string) => void;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (feedback === null) input.current?.focus();
  }, [item.id, feedback]);

  return (
    <>
      <label htmlFor="answer" className="block text-lg font-medium">
        {instruction || t("practice.recall.label")}
      </label>
      <div className="mt-5">
        <PromptDisplay item={item} />
      </div>
      <input
        id="answer"
        ref={input}
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        readOnly={feedback !== null}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={cn(
          "mt-6 min-h-14 w-full rounded-xl border bg-paper px-4 text-center text-2xl outline-none focus:border-accent",
          feedback === null && "border-line",
          feedback?.correct && "border-success",
          feedback && !feedback.correct && "border-danger",
        )}
      />
    </>
  );
}
