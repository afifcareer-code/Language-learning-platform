"use client";

import type { AttemptFeedback } from "@/features/practice/actions";
import { AudioPlayButton } from "@/audio/audio-play-button";
import { useSpeech } from "@/audio/use-speech";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import { PromptDisplay } from "./prompt-display";
import type { PracticeItem } from "@/features/japanese/practice-items";

/**
 * Recognition. Two directions, always stated in the instruction:
 *
 * - Sound → character (`item.audioPrompt`): the sound is played and the
 *   character is not shown before answering; the options are characters.
 * - Character → answer: the item is shown and the options are its sound or
 *   meaning. Also the fallback when the device has no voice for the sound,
 *   so a question never depends on audio that cannot play.
 */
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
  const speech = useSpeech(item.speechLang);
  // While voices are still loading the question stays audio-first (nothing is revealed);
  // it only falls back once the device is known to have no voice.
  const noAudio = item.audioPrompt && speech.status === "unavailable";
  const audioFirst = item.audioPrompt && !noAudio;

  const prompt = audioFirst
    ? instruction || t("practice.recognition.audioPrompt")
    : noAudio
      ? t("practice.recognition.visualPrompt")
      : instruction ||
        (item.answerKind === "reading"
          ? t("practice.recognition.readingPrompt")
          : item.answerKind === "meaning"
            ? t("practice.recognition.meaningPrompt")
            : t("practice.recognition.prompt"));
  const labelOf = (choice: PracticeItem["choices"][number]) => (audioFirst ? choice.glyph : choice.label);

  // One size for every option, so long meanings and short words line up.
  const longLabels = !audioFirst && item.choices.some((c) => c.label.length > 12);
  return (
    <>
      <p className="text-lg font-medium">{prompt}</p>
      {noAudio && (
        <p role="note" className="mt-2 text-sm text-muted">
          {t("practice.recognition.noAudio")}
        </p>
      )}

      {audioFirst ? (
        <div className="mt-5">
          <AudioPlayButton speech={speech} text={item.speech} />
        </div>
      ) : (
        <div className="mt-5">
          <PromptDisplay item={item} />
        </div>
      )}

      {audioFirst && (
        <p className="mt-6 text-muted">
          {item.answerKind === "meaning"
            ? t("practice.recognition.audioQuestionMeaning")
            : t("practice.recognition.audioQuestion")}
        </p>
      )}
      <div
        className={cn(
          "grid gap-3",
          audioFirst ? "mt-3" : "mt-6",
          // Short answers (sounds, characters) fit two per row; meanings get a full row each on phones.
          longLabels ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2",
        )}
        role="group"
        aria-label={
          audioFirst
            ? item.answerKind === "meaning"
              ? t("practice.recognition.audioQuestionMeaning")
              : t("practice.recognition.audioQuestion")
            : prompt
        }
      >
        {item.choices.map((choice) => {
          const isAnswer = choice.id === item.id;
          const isChosen = choice.id === chosen;
          return (
            <button
              key={choice.id}
              type="button"
              lang={audioFirst ? "ja" : undefined}
              disabled={disabled || feedback !== null}
              onClick={() => onChoose(choice.id)}
              className={cn(
                "rounded-xl border px-3 py-2 font-medium transition-colors disabled:cursor-default",
                audioFirst
                  ? "font-jp min-h-20 text-5xl"
                  : cn("min-h-16", longLabels ? "text-lg" : "text-2xl"),
                feedback === null && "border-line bg-paper hover:border-accent hover:bg-accent-soft",
                feedback !== null && isAnswer && "border-success bg-success-soft text-success",
                feedback !== null && isChosen && !isAnswer && "border-danger bg-danger-soft text-danger",
                feedback !== null && !isAnswer && !isChosen && "border-line opacity-50",
              )}
            >
              {labelOf(choice)}
            </button>
          );
        })}
      </div>
    </>
  );
}
