"use client";

import { useMemo, useRef, useState } from "react";
import { SpeakButton } from "@/audio/speak-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HandwritingCanvas } from "@/handwriting/canvas/handwriting-canvas";
import { GUIDE_OPACITY } from "@/handwriting/guidance";
import { StrokeCountAnalyzer } from "@/handwriting/recognition/stroke-count-analyzer";
import type { WritingCheck } from "@/handwriting/recognition/types";
import type { SelfAssessment } from "@/handwriting/scoring/score";
import type { Stroke, WritingSample } from "@/handwriting/strokes/types";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import type { PracticeItem } from "@/features/japanese/practice-items";

const analyzer = new StrokeCountAnalyzer();

const SELF_OPTIONS: { value: SelfAssessment; variant: "primary" | "secondary" }[] = [
  { value: "incorrect", variant: "secondary" },
  { value: "close", variant: "secondary" },
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
 * compares with the model and grades themselves; automatic checks can only
 * lower that grade.
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
  onSubmit: (sample: WritingSample, self: SelfAssessment) => void;
}) {
  const t = useT();
  const checkLabel = useCheckLabel();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [checked, setChecked] = useState(false);
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

  const guideOpacity = checked ? 0.35 : hintShown ? 0.18 : GUIDE_OPACITY[item.stage];

  function grade(self: SelfAssessment) {
    const rect = box.current?.getBoundingClientRect();
    onSubmit(
      {
        strokes,
        width: Math.max(1, Math.round(rect?.width ?? 1)),
        height: Math.max(1, Math.round(rect?.height ?? 1)),
        capturedAt: new Date().toISOString(),
      },
      self,
    );
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
          <p className="text-sm text-muted">{t("practice.writing.writeFor", { script: item.cueKind })}</p>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-4xl font-semibold">{item.cue}</p>
            <SpeakButton text={item.speech} lang="ja" />
          </div>
          <p className="mt-2 text-sm text-muted">
            {t("practice.writing.guide", { stage: t(`practice.writing.stages.${item.stage}`) })}
          </p>
          {instruction && <p className="mt-2 text-sm text-muted">{instruction}</p>}
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
            <p className="text-sm text-muted">{t("practice.writing.compare")}</p>
            <div className="grid grid-cols-3 gap-2">
              {SELF_OPTIONS.map((o) => (
                <Button
                  key={o.value}
                  variant={o.variant}
                  className="px-2"
                  onClick={() => grade(o.value)}
                  disabled={disabled}
                >
                  {t(`practice.writing.self.${o.value}`)}
                </Button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setChecked(false)} disabled={disabled}>
              {t("practice.writing.keepWriting")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
