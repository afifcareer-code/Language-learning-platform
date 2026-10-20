"use client";

import type { AttemptFeedback } from "@/features/practice/actions";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import type { PracticeItem } from "@/features/kana/kana-view";

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
  return (
    <>
      <p lang={item.displayLang} className="font-jp text-[7rem] leading-none md:text-[9rem]">
        {item.display}
      </p>
      <p className="mt-6 text-muted">{instruction || t("practice.recognition.prompt")}</p>
      <div
        className="mt-4 grid grid-cols-2 gap-3"
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
                "min-h-16 rounded-xl border text-2xl font-medium transition-colors disabled:cursor-default",
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
