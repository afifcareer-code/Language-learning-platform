"use client";

import type { AttemptFeedback } from "@/features/practice/actions";
import { AudioPlayButton } from "@/audio/audio-play-button";
import { useSpeech } from "@/audio/use-speech";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import type { PracticeItem } from "@/features/japanese/practice-items";

/**
 * Comprehension: read a short text, or listen to a short conversation, then answer one
 * question by picking an option. A conversation is played, not shown; its transcript appears
 * after answering, and stands in for the audio only when the device cannot play it.
 */
export function ComprehensionExercise({
  item,
  feedback,
  chosen,
  disabled,
  onChoose,
}: {
  item: PracticeItem;
  feedback: AttemptFeedback | null;
  chosen: number | null;
  disabled: boolean;
  onChoose: (index: number) => void;
}) {
  const t = useT();
  const speech = useSpeech(item.speechLang);
  const passage = item.passage!;
  const listening = passage.form === "dialogue";
  const noAudio = listening && speech.status === "unavailable";
  const showText = !listening || noAudio || feedback !== null;
  const correctIndex = feedback?.correct ? chosen : null;

  return (
    <>
      <p className="text-lg font-medium">
        {listening
          ? t("practice.comprehension.listenInstruction")
          : t("practice.comprehension.readInstruction")}
      </p>
      {noAudio && (
        <p role="note" className="mt-2 text-sm text-muted">
          {t("practice.comprehension.noAudio")}
        </p>
      )}
      {listening && !noAudio && (
        <div className="mt-5">
          <AudioPlayButton speech={speech} text={item.speech} />
        </div>
      )}
      {showText && (
        <div
          lang="ja"
          className={cn(
            "font-jp mx-auto mt-5 max-w-prose rounded-xl bg-sunken px-4 py-3 text-left text-2xl leading-relaxed",
            listening && "text-xl",
          )}
          data-testid="passage-text"
        >
          {passage.lines.map((line, i) => (
            <p key={i}>
              {line.map((segment, j) =>
                segment.reading ? (
                  <ruby key={j}>
                    {segment.text}
                    <rp>(</rp>
                    <rt>{segment.reading}</rt>
                    <rp>)</rp>
                  </ruby>
                ) : (
                  <span key={j}>{segment.text}</span>
                ),
              )}
            </p>
          ))}
        </div>
      )}
      <p className="mt-6 font-medium">{passage.question}</p>
      <div
        className="mt-3 grid grid-cols-1 gap-3 text-left sm:grid-cols-2"
        role="group"
        aria-label={passage.question}
      >
        {passage.options.map((option) => {
          const isChosen = chosen === option.index;
          return (
            <button
              key={option.index}
              type="button"
              disabled={disabled || feedback !== null}
              onClick={() => onChoose(option.index)}
              className={cn(
                "min-h-16 rounded-xl border px-3 py-2 text-lg font-medium transition-colors disabled:cursor-default",
                feedback === null && "border-line bg-paper hover:border-accent hover:bg-accent-soft",
                feedback !== null &&
                  isChosen &&
                  feedback.correct &&
                  "border-success bg-success-soft text-success",
                feedback !== null &&
                  isChosen &&
                  !feedback.correct &&
                  "border-danger bg-danger-soft text-danger",
                feedback !== null && !isChosen && "border-line opacity-60",
                correctIndex === option.index && "border-success",
              )}
            >
              {option.text}
            </button>
          );
        })}
      </div>
      {feedback !== null && passage.gloss && (
        <p className="mt-5 text-left text-sm" data-testid="passage-gloss">
          <span className="font-medium">{t("practice.comprehension.gloss")}</span> {passage.gloss}
        </p>
      )}
      {passage.credit && (
        <p className="mt-3 text-left text-xs text-muted">
          {t("practice.comprehension.credit", {
            author: passage.credit.author,
            work: passage.credit.work,
            license: passage.credit.license,
          })}{" "}
          <a href={passage.credit.url} target="_blank" rel="noreferrer" className="underline">
            {t("practice.attribution.link")}
          </a>
        </p>
      )}
    </>
  );
}
