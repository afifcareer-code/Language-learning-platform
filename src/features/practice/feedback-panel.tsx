"use client";

import type { AttemptFeedback } from "@/features/practice/actions";
import { SpeakButton } from "@/audio/speak-button";
import { MasteryBadge } from "@/components/ui/mastery-badge";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import type { PracticeItem } from "@/features/kana/kana-view";

/** Immediate, explainable feedback after one answer. */
export function FeedbackPanel({ feedback, item }: { feedback: AttemptFeedback; item: PracticeItem }) {
  const t = useT();
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl px-4 py-3 text-center",
        feedback.correct ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      <div className="flex items-center justify-center gap-3">
        <span className="font-medium">
          {feedback.correct
            ? t("practice.feedback.correct")
            : t("practice.feedback.answer", { answer: feedback.expected })}
        </span>
        <SpeakButton text={item.display} lang={item.displayLang} className="size-10" />
      </div>
      {feedback.confusedWith && (
        <p className="mt-1 text-sm">
          {t("practice.feedback.confusedWith", { item: feedback.confusedWith.display })}
        </p>
      )}
      <div className="mt-2 flex items-center justify-center gap-2 text-sm">
        {feedback.previousMastery !== feedback.mastery && (
          <>
            <MasteryBadge
              state={feedback.previousMastery}
              label={t(`common.mastery.${feedback.previousMastery}`)}
            />
            <span aria-hidden="true">→</span>
          </>
        )}
        <MasteryBadge state={feedback.mastery} label={t(`common.mastery.${feedback.mastery}`)} />
      </div>
    </div>
  );
}
