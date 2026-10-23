"use client";

import { useRef, useState } from "react";
import { AudioPlayButton } from "@/audio/audio-play-button";
import { useSpeech } from "@/audio/use-speech";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HandwritingCanvas } from "@/handwriting/canvas/handwriting-canvas";
import type { Stroke } from "@/handwriting/strokes/types";
import { useT } from "@/localization/client";
import type { PracticeItem } from "@/features/japanese/practice-items";
import { SELF_WRITING_RATINGS, type SelfWritingRating } from "./self-writing";

/**
 * Writing a word, phrase or sentence by hand. The cue is the meaning (and the sound,
 * when the device can play it). The app does not read handwriting: after writing, the
 * model is shown and the learner rates their own writing. The rating is the evidence.
 */
export function TextWritingExercise({
  item,
  disabled,
  onSubmit,
}: {
  item: PracticeItem;
  disabled: boolean;
  onSubmit: (rating: SelfWritingRating) => void;
}) {
  const t = useT();
  const speech = useSpeech(item.speechLang);
  const hasAudio = speech.status !== "unavailable";
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [revealed, setRevealed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start md:gap-6">
      <div ref={box} className="w-full">
        <HandwritingCanvas
          wide
          strokes={strokes}
          onStrokesChange={setStrokes}
          disabled={revealed || disabled}
          label={t("practice.textWriting.canvasLabel", { prompt: item.cue })}
        />
      </div>
      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-lg font-medium">
            {t.dynamic(["practice", "textWriting", "instruction", item.cueKind], undefined, "")}
          </p>
          <p className="mt-3 text-sm text-muted">{t("practice.textWriting.meaning")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-semibold">{item.cue}</p>
            {hasAudio && <AudioPlayButton speech={speech} text={item.speech} variant="compact" />}
          </div>
        </div>

        {!revealed ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={() => setStrokes((s) => s.slice(0, -1))}
                disabled={!strokes.length}
              >
                {t("practice.writing.undo")}
              </Button>
              <Button variant="secondary" onClick={() => setStrokes([])} disabled={!strokes.length}>
                {t("practice.writing.clear")}
              </Button>
            </div>
            <Button onClick={() => setRevealed(true)} disabled={!strokes.length}>
              {t("practice.textWriting.showModel")}
            </Button>
            <p className="text-xs text-muted">{t("practice.textWriting.selfNote")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted">{t("practice.textWriting.model")}</p>
              <p lang="ja" className="font-jp text-3xl leading-snug" data-testid="writing-model">
                {item.display}
              </p>
            </div>
            <p className="text-sm text-muted">{t("practice.textWriting.compare")}</p>
            <div role="group" aria-label={t("practice.textWriting.rateLabel")} className="grid gap-2">
              {SELF_WRITING_RATINGS.map((rating) => (
                <Button
                  key={rating}
                  variant={rating === "correct" ? "primary" : "secondary"}
                  onClick={() => onSubmit(rating)}
                  disabled={disabled}
                >
                  {t(`practice.textWriting.rating.${rating}`)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
