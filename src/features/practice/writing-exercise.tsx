"use client";

import { useMemo, useRef, useState } from "react";
import { AudioPlayButton } from "@/audio/audio-play-button";
import { useSpeech } from "@/audio/use-speech";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StrokeOrder } from "@/components/learning/stroke-order";
import { HandwritingCanvas } from "@/handwriting/canvas/handwriting-canvas";
import { GUIDE_OPACITY } from "@/handwriting/guidance";
import { glyphReference } from "@/handwriting/recognition/glyph-reference";
import { shapeSimilarity } from "@/handwriting/recognition/shape";
import { StrokeCountAnalyzer } from "@/handwriting/recognition/stroke-count-analyzer";
import type { WritingCheck } from "@/handwriting/recognition/types";
import { evaluateWriting, type WritingQuality } from "@/handwriting/scoring/quality";
import type { SelfAssessment } from "@/handwriting/scoring/score";
import type { Stroke, WritingSample } from "@/handwriting/strokes/types";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import type { PracticeItem } from "@/features/japanese/practice-items";

const analyzer = new StrokeCountAnalyzer();

/** Is this the character? The learner decides after comparing with the model. */
const SELF_OPTIONS: { value: "correct" | "incorrect"; variant: "primary" | "secondary" }[] = [
  { value: "incorrect", variant: "secondary" },
  { value: "correct", variant: "primary" },
];

/** Localized text for one automatic writing check. */
export function useCheckLabel() {
  const t = useT();
  const list = new Intl.ListFormat(t.intlLocale, { type: "disjunction" });
  return (check: WritingCheck) => {
    const count = typeof check.values.count === "number" ? check.values.count : 0;
    const expected = Array.isArray(check.values.expected)
      ? list.format(check.values.expected.map(String))
      : "";
    return t.dynamic(
      ["practice", "checks", check.id, check.passed ? "pass" : "fail"],
      { count, expected },
      check.id,
    );
  };
}

/**
 * Handwriting: the guide fades with mastery. After writing, the learner
 * compares with the model and says whether it is the same character; the
 * measured stroke count and shape then set how precise it was. The result keeps
 * the two apart: a correct character with imprecise handwriting can be improved
 * or accepted, it is not a failure.
 */
export function WritingExercise({
  item,
  instruction,
  disabled,
  onSubmit,
}: {
  item: PracticeItem;
  instruction: string;
  disabled: boolean;
  /** `retry`: the character was not right, so the attempt is recorded and the learner writes it again. */
  onSubmit: (sample: WritingSample, self: SelfAssessment, shapeScore: number | null, retry: boolean) => void;
}) {
  const t = useT();
  const checkLabel = useCheckLabel();
  const speech = useSpeech(item.speechLang);
  // Without a voice the sound is still shown in romaji; the instruction says so honestly.
  const hasAudio = speech.status !== "unavailable";
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [checked, setChecked] = useState(false);
  const [self, setSelf] = useState<SelfAssessment | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const analysis = useMemo(
    () =>
      checked
        ? analyzer.analyze(
            { strokes, width: 1, height: 1, capturedAt: "" },
            { text: item.display, strokeCounts: item.strokeCounts },
          )
        : null,
    [checked, strokes, item],
  );

  // How closely the drawing follows the model, measured against the glyph in the learner's fonts.
  // Null when the device cannot draw that glyph; precision then rests on the stroke count.
  const shapeScore = useMemo(() => {
    if (!checked) return null;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jp").trim() || "serif";
    const reference = glyphReference(item.display, family);
    return reference ? shapeSimilarity({ strokes, width: 1, height: 1, capturedAt: "" }, reference) : null;
  }, [checked, strokes, item.display]);

  const evaluation = analysis && self ? evaluateWriting({ checks: analysis.checks, shapeScore, self }) : null;

  const guideOpacity = checked ? 0.35 : hintShown ? 0.18 : GUIDE_OPACITY[item.stage];

  function sample(): WritingSample {
    const rect = box.current?.getBoundingClientRect();
    return {
      strokes,
      width: Math.max(1, Math.round(rect?.width ?? 1)),
      height: Math.max(1, Math.round(rect?.height ?? 1)),
      capturedAt: new Date().toISOString(),
    };
  }

  /** "Perbaiki tulisan": back to the writing area for the same character, with the same guide. */
  function improve() {
    setStrokes([]);
    setChecked(false);
    setSelf(null);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start md:gap-6">
      {/* Keep the square surface within the viewport on landscape tablets. */}
      <div ref={box} className="mx-auto w-full max-w-[calc(100dvh-14rem)] md:max-w-[calc(100dvh-18rem)]">
        <HandwritingCanvas
          strokes={strokes}
          onStrokesChange={setStrokes}
          guideText={item.display}
          guideOpacity={guideOpacity}
          disabled={checked || disabled}
          label={t("practice.writing.canvasLabel", { prompt: item.cue })}
        />
      </div>
      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-lg font-medium">
            {item.strokeOrder
              ? t("practice.writing.kanjiInstruction")
              : hasAudio
                ? instruction || t("practice.writing.instruction")
                : t("practice.writing.instructionVisual")}
          </p>
          <p className="mt-3 text-sm text-muted">
            {t("practice.writing.writeFor", { script: item.cueKind })}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="text-4xl font-semibold">{item.cue}</p>
            {hasAudio && item.speech && (
              <AudioPlayButton speech={speech} text={item.speech} variant="compact" />
            )}
          </div>
          {item.strokeOrder && item.reading && (
            <p lang="ja" className="mt-1 text-lg">
              {item.reading}
            </p>
          )}
          <p className="mt-2 text-sm text-muted">
            {t("practice.writing.guide", { stage: t(`practice.writing.stages.${item.stage}`) })}
          </p>
          {item.strokeOrder && (checked || item.stage !== "recall" || hintShown) && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">{t("practice.writing.strokeOrder")}</p>
              <StrokeOrder
                strokes={item.strokeOrder.strokes}
                viewBox={item.strokeOrder.viewBox}
                label={t("practice.writing.strokeOrderLabel", {
                  character: item.display,
                  count: item.strokeOrder.strokes.length,
                })}
                replayLabel={t("practice.writing.replay")}
                size={144}
              />
            </div>
          )}
        </div>

        {!checked ? (
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
            {item.stage === "minimal_hint" && !hintShown && (
              <Button variant="ghost" onClick={() => setHintShown(true)}>
                {t("practice.writing.showHint")}
              </Button>
            )}
            <Button onClick={() => setChecked(true)} disabled={!strokes.length}>
              {t("common.actions.check")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span lang={item.displayLang} className="font-jp text-6xl leading-none">
                {item.display}
              </span>
              <ul className="text-sm">
                {analysis?.checks.map((c) => (
                  <li key={c.id} className={cn(c.passed ? "text-success" : "text-danger")}>
                    {c.passed ? "✓" : "✗"} {checkLabel(c)}
                  </li>
                ))}
              </ul>
            </div>

            {!evaluation ? (
              <>
                <p className="text-sm text-muted">{t("practice.writing.compare")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {SELF_OPTIONS.map((o) => (
                    <Button
                      key={o.value}
                      variant={o.variant}
                      className="px-2"
                      onClick={() => setSelf(o.value)}
                      disabled={disabled}
                    >
                      {t(`practice.writing.self.${o.value}`)}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setChecked(false)} disabled={disabled}>
                  {t("practice.writing.keepWriting")}
                </Button>
              </>
            ) : (
              <WritingResult
                quality={evaluation.quality}
                character={item.display}
                disabled={disabled}
                onImprove={improve}
                onSubmit={(retry) => onSubmit(sample(), self!, shapeScore, retry)}
              />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * The outcome of one writing attempt: is it the character, and how precise
 * was it. Correct but imprecise offers a choice instead of forcing a rewrite.
 */
function WritingResult({
  quality,
  character,
  disabled,
  onImprove,
  onSubmit,
}: {
  quality: WritingQuality;
  character: string;
  disabled: boolean;
  onImprove: () => void;
  onSubmit: (retry: boolean) => void;
}) {
  const t = useT();
  const correct = quality !== "incorrect";
  return (
    <div role="group" aria-label={t("practice.writing.result.label")} className="flex flex-col gap-3">
      <p
        className={cn("text-lg font-medium", correct ? "text-success" : "text-danger")}
        data-testid="writing-character-result"
      >
        <span aria-hidden="true">{correct ? "✓ " : "✕ "}</span>
        {correct
          ? t("practice.writing.result.characterCorrect")
          : t("practice.writing.result.characterIncorrect")}
      </p>
      <p className="text-sm">
        {correct && <span className="font-medium">{t("practice.writing.result.shapeLabel")} </span>}
        {t(`practice.writing.result.quality.${quality}`, { character })}
      </p>
      {quality === "incorrect" ? (
        <Button onClick={() => onSubmit(true)} disabled={disabled}>
          {t("practice.writing.result.retry")}
        </Button>
      ) : quality === "needs_improvement" ? (
        <>
          <Button onClick={onImprove} disabled={disabled}>
            {t("practice.writing.result.improve")}
          </Button>
          <Button variant="secondary" onClick={() => onSubmit(false)} disabled={disabled}>
            {t("practice.writing.result.continueAnyway")}
          </Button>
        </>
      ) : (
        <Button onClick={() => onSubmit(false)} disabled={disabled}>
          {t("practice.writing.result.continue")}
        </Button>
      )}
    </div>
  );
}
