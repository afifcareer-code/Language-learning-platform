"use client";

import type { AttemptFeedback } from "@/features/practice/actions";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import { PromptDisplay } from "./prompt-display";
import type { PracticeItem } from "@/features/japanese/practice-items";

/** Recognition: see the item, pick the matching answer from a few options. */
export function RecognitionExercise({
  item,
  instruction,
  feedback,
  chosen,
  disabled,
  onChoose,
}: {
  item: PracticeItem;
  instruction: string;
  feedback: AttemptFeedback | null;
  chosen: string | null;
  disabled: boolean;
  onChoose: (choiceId: string) => void;
}) {
  const t = useT();
  // One size for every option, so long meanings and short words line up.
  const longLabels = item.choices.some((c) => c.label.length > 12);
  return (
    <>
      <PromptDisplay item={item} />
      <p className="mt-6 text-muted">{instruction || t("practice.recognition.prompt")}</p>
      <div
        className={cn(
          "mt-4 grid gap-3",
          // Short answers (sounds) fit two per row; meanings get a full row each on phones.
          longLabels ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2",
        )}
        role="group"
        aria-label={instruction || t("practice.recognition.prompt")}
      >
        {item.choices.map((choice) => {
          const isAnswer = choice.id === item.id;
          const isChosen = choice.id === chosen;
          return (
            <button
              key={choice.id}
              type="button"
              disabled={disabled || feedback !== null}
              onClick={() => onChoose(choice.id)}
              className={cn(
                "min-h-16 rounded-xl border px-3 py-2 font-medium transition-colors disabled:cursor-default",
                longLabels ? "text-lg" : "text-2xl",
                feedback === null && "border-line bg-paper hover:border-accent hover:bg-accent-soft",
                feedback !== null && isAnswer && "border-success bg-success-soft text-success",
                feedback !== null && isChosen && !isAnswer && "border-danger bg-danger-soft text-danger",
                feedback !== null && !isAnswer && !isChosen && "border-line opacity-50",
              )}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
