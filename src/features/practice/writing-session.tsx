"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { submitWritingAttempt } from "@/app/practice/actions";
import { SpeakButton } from "@/audio/speak-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MasteryBadge } from "@/components/ui/mastery-badge";
import type { MasteryState } from "@/core/mastery";
import type { KanaView } from "@/features/kana/kana-view";
import { WritingCanvas } from "@/handwriting/canvas/writing-canvas";
import { GUIDE_OPACITY, WRITING_STAGE_LABELS, type WritingStage } from "@/handwriting/guidance";
import { StrokeCountAnalyzer } from "@/handwriting/recognition/stroke-count-analyzer";
import type { SelfAssessment } from "@/handwriting/scoring/score";
import type { Stroke } from "@/handwriting/strokes/types";
import { cn } from "@/shared/cn";
import { useStopwatch } from "@/shared/use-stopwatch";
import { SessionProgress } from "./session-progress";
import { SessionSummary, type SessionOutcome } from "./session-summary";

export interface WritingPrompt extends KanaView {
  stage: WritingStage;
}

const analyzer = new StrokeCountAnalyzer();

const SELF_OPTIONS: { value: SelfAssessment; label: string; variant: "primary" | "secondary" }[] = [
  { value: "incorrect", label: "Not yet", variant: "secondary" },
  { value: "close", label: "Close", variant: "secondary" },
  { value: "correct", label: "Correct", variant: "primary" },
];

/**
 * Handwriting practice. The guide fades with mastery; after writing, the
 * learner compares with the model and grades themselves, combined with
 * automatic structural checks.
 */
export function WritingSession({ prompts, mode }: { prompts: WritingPrompt[]; mode: "practice" | "review" }) {
  const [index, setIndex] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [checked, setChecked] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [lastState, setLastState] = useState<MasteryState | null>(null);
  const [outcomes, setOutcomes] = useState<SessionOutcome[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canvasBox = useRef<HTMLDivElement>(null);

  const elapsed = useStopwatch(index);
  const prompt = prompts[index];

  const analysis = useMemo(
    () =>
      prompt && checked
        ? analyzer.analyze(
            { strokes, width: 1, height: 1, capturedAt: "" },
            { text: prompt.kana, strokeCounts: prompt.strokeCounts },
          )
        : null,
    [prompt, checked, strokes],
  );

  if (!prompt) return <SessionSummary outcomes={outcomes} />;

  const guideOpacity = checked ? 0.35 : hintShown ? 0.18 : GUIDE_OPACITY[prompt.stage];

  function grade(self: SelfAssessment) {
    if (!prompt) return;
    startTransition(async () => {
      try {
        const rect = canvasBox.current?.getBoundingClientRect();
        const result = await submitWritingAttempt({
          itemId: prompt.id,
          mode,
          stage: prompt.stage,
          selfAssessment: self,
          responseMs: elapsed(),
          sample: {
            strokes,
            width: Math.max(1, Math.round(rect?.width ?? 1)),
            height: Math.max(1, Math.round(rect?.height ?? 1)),
            capturedAt: new Date().toISOString(),
          },
        });
        setOutcomes((o) => [...o, { id: prompt.id, label: prompt.kana, correct: result.correct }]);
        setLastState(result.masteryState);
        setIndex((i) => i + 1);
        setStrokes([]);
        setChecked(false);
        setHintShown(false);
        setError(null);
      } catch {
        setError("Could not save this attempt. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <SessionProgress index={index} total={prompts.length} />
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start md:gap-6">
        {/* Keep the square surface within the viewport on landscape tablets. */}
        <div
          ref={canvasBox}
          className="mx-auto w-full max-w-[calc(100dvh-12rem)] md:max-w-[calc(100dvh-14rem)]"
        >
          <WritingCanvas
            key={prompt.id}
            strokes={strokes}
            onStrokesChange={setStrokes}
            guideText={prompt.kana}
            guideOpacity={guideOpacity}
            disabled={checked || pending}
            label={`Writing area for ${prompt.romaji}`}
          />
        </div>
        <Card className="flex flex-col gap-5">
          <div>
            <p className="text-sm text-muted">Write the {prompt.script} for</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-4xl font-semibold">{prompt.romaji}</p>
              <SpeakButton text={prompt.kana} lang="ja" />
            </div>
            <p className="mt-2 text-sm text-muted">Guide: {WRITING_STAGE_LABELS[prompt.stage]}</p>
          </div>

          {!checked ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setStrokes((s) => s.slice(0, -1))}
                  disabled={!strokes.length}
                >
                  Undo
                </Button>
                <Button variant="secondary" onClick={() => setStrokes([])} disabled={!strokes.length}>
                  Clear
                </Button>
              </div>
              {prompt.stage === "minimal_hint" && !hintShown && (
                <Button variant="ghost" onClick={() => setHintShown(true)}>
                  Show hint
                </Button>
              )}
              <Button onClick={() => setChecked(true)} disabled={!strokes.length}>
                Check
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span lang="ja" className="font-jp text-6xl leading-none">
                  {prompt.kana}
                </span>
                <ul className="text-sm">
                  {analysis?.checks.map((c) => (
                    <li key={c.id} className={cn(c.passed ? "text-success" : "text-danger")}>
                      {c.passed ? "✓" : "✗"} {c.detail}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-muted">Compare your writing with the model. How did you do?</p>
              <div className="grid grid-cols-3 gap-2">
                {SELF_OPTIONS.map((o) => (
                  <Button
                    key={o.value}
                    variant={o.variant}
                    className="px-2"
                    onClick={() => grade(o.value)}
                    disabled={pending}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setChecked(false)} disabled={pending}>
                Keep writing
              </Button>
            </div>
          )}
          {error && <p className="text-danger">{error}</p>}
          {lastState && (
            <p className="text-sm text-muted">
              Previous item: <MasteryBadge state={lastState} />
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
