"use client";

import type { AttemptFeedback } from "@/features/practice/actions";
import { AudioPlayButton } from "@/audio/audio-play-button";
import { useSpeech } from "@/audio/use-speech";
import { MasteryBadge } from "@/components/ui/mastery-badge";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import type { PracticeItem } from "@/features/japanese/practice-items";

/**
 * Immediate, explainable feedback after one answer: the result, the answer
 * (with its sound, for characters), one short hint, and a way to listen again.
 */
export function FeedbackPanel({ feedback, item }: { feedback: AttemptFeedback; item: PracticeItem }) {
  const t = useT();
  const speech = useSpeech(item.speechLang);
  // Same rule as the question: audio-first unless the device has no voice.
  const audioFirst = item.audioPrompt && speech.status !== "unavailable";
  // When the question asked for a character, the answer is the character, not its romaji.
  const answer = audioFirst ? item.display : feedback.expected;
  // "あ = a": shown once the learner has answered, never before.
  const showPair = item.reading !== "" && (audioFirst || feedback.correct);

  return (
    <div
      role="status"
      className={cn(
        "rounded-xl px-4 py-3 text-center",
        feedback.correct ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      <p className="font-medium">
        <span aria-hidden="true">{feedback.correct ? "✓ " : "✕ "}</span>
        {feedback.correct ? t("practice.feedback.correct") : t("practice.feedback.incorrect")}
      </p>
      {!feedback.correct && <p className="mt-1">{t("practice.feedback.answer", { answer })}</p>}
      {showPair && (
        <p className="mt-1 text-3xl">
          <span lang={item.displayLang} className="font-jp">
            {item.display}
          </span>{" "}
          = {item.reading}
        </p>
      )}
      {audioFirst && (
        <p className="mt-1 text-sm">
          {feedback.correct ? t("practice.feedback.audioCorrect") : t("practice.feedback.audioIncorrect")}
        </p>
      )}
      {feedback.confusedWith && (
        <p className="mt-1 text-sm">
          {audioFirst
            ? t("practice.feedback.confusedWithChosen", { item: feedback.confusedWith.display })
            : t("practice.feedback.confusedWith", { item: feedback.confusedWith.display })}
        </p>
      )}
      {item.speech && speech.status !== "unavailable" && (
        <div className="mt-3 flex justify-center">
          <AudioPlayButton
            speech={speech}
            text={item.speech}
            variant="compact"
            idleLabel={t("common.audio.playAgain")}
          />
        </div>
      )}
      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
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
