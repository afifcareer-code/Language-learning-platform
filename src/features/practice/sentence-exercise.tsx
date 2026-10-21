"use client";

import type { AttemptFeedback } from "@/features/practice/actions";
import type { PracticeItem } from "@/features/japanese/practice-items";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import { PromptDisplay } from "./prompt-display";

/**
 * Sentence building (controlled practice): arrange the pieces to express the
 * meaning. Pieces are identified by position, so repeated words work.
 */
export function SentenceExercise({
  item,
  instruction,
  placed,
  feedback,
  onPlace,
  onRemove,
}: {
  item: PracticeItem;
  instruction: string;
  /** Indexes into item.tokens, in the order placed. */
  placed: number[];
  feedback: AttemptFeedback | null;
  onPlace: (index: number) => void;
  onRemove: (position: number) => void;
}) {
  const t = useT();
  const locked = feedback !== null;
  return (
    <>
      <PromptDisplay item={item} />
      <p className="mt-6 text-muted">{instruction || t("practice.sentence.instruction")}</p>

      <div
        role="group"
        aria-label={t("practice.sentence.answer")}
        aria-live="polite"
        className={cn(
          "mt-4 flex min-h-20 flex-wrap items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3",
          feedback === null && "border-line",
          feedback?.correct && "border-success-fill bg-success-soft",
          feedback && !feedback.correct && "border-danger bg-danger-soft",
        )}
      >
        {placed.length === 0 && <span className="text-sm text-muted">{t("practice.sentence.empty")}</span>}
        {placed.map((tokenIndex, position) => (
          <button
            key={`${tokenIndex}-${position}`}
            type="button"
            lang="ja"
            disabled={locked}
            onClick={() => onRemove(position)}
            aria-label={t("practice.sentence.remove", { piece: item.tokens[tokenIndex]! })}
            className="min-h-12 rounded-lg bg-accent-soft px-3 font-jp text-xl text-accent disabled:cursor-default"
          >
            {item.tokens[tokenIndex]}
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label={t("practice.sentence.pieces")}
        className="mt-4 flex flex-wrap justify-center gap-2"
      >
        {item.tokens.map((token, index) => {
          const used = placed.includes(index);
          return (
            <button
              key={`${token}-${index}`}
              type="button"
              lang="ja"
              disabled={locked || used}
              onClick={() => onPlace(index)}
              className={cn(
                "min-h-12 rounded-lg border border-line bg-surface px-3 font-jp text-xl transition-colors",
                used ? "opacity-30" : "hover:border-accent",
              )}
            >
              {token}
            </button>
          );
        })}
      </div>
    </>
  );
}
