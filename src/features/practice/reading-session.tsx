"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { submitReadingAnswer, type ReadingResult } from "@/app/practice/actions";
import { SpeakButton } from "@/audio/speak-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MasteryBadge } from "@/components/ui/mastery-badge";
import type { KanaView } from "@/features/kana/kana-view";
import { cn } from "@/shared/cn";
import { useStopwatch } from "@/shared/use-stopwatch";
import { SessionProgress } from "./session-progress";
import { SessionSummary, type SessionOutcome } from "./session-summary";

/** Active recall: see the character, type its reading. No multiple choice. */
export function ReadingSession({ items, mode }: { items: KanaView[]; mode: "practice" | "review" }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [outcomes, setOutcomes] = useState<SessionOutcome[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const elapsed = useStopwatch(index);
  const item = items[index];

  if (!item) return <SessionSummary outcomes={outcomes} />;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (result) return next();
    if (!answer.trim() || !item) return;
    const responseMs = elapsed();
    startTransition(async () => {
      try {
        const r = await submitReadingAnswer({ itemId: item.id, answer, responseMs, mode });
        setResult(r);
        setOutcomes((o) => [...o, { id: item.id, label: item.kana, correct: r.correct }]);
        setError(null);
      } catch {
        setError("Could not save your answer. Please try again.");
      }
    });
  }

  function next() {
    setIndex((i) => i + 1);
    setAnswer("");
    setResult(null);
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto max-w-xl">
      <SessionProgress index={index} total={items.length} />
      <Card className="text-center">
        <p lang="ja" className="font-jp text-[7rem] leading-none md:text-[9rem]">
          {item.kana}
        </p>
        <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
          <label htmlFor="answer" className="text-muted">
            Type the reading in romaji
          </label>
          <input
            id="answer"
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            readOnly={result !== null}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={cn(
              "min-h-14 rounded-xl border bg-paper px-4 text-center text-2xl outline-none focus:border-accent",
              result === null && "border-line",
              result?.correct && "border-success",
              result && !result.correct && "border-danger",
            )}
          />
          {result && (
            <div
              role="status"
              className={cn(
                "rounded-xl px-4 py-3",
                result.correct ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
              )}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="font-medium">
                  {result.correct ? "Correct" : `Answer: ${result.expected}`}
                </span>
                <SpeakButton text={item.kana} lang="ja" className="size-10" />
              </div>
              <div className="mt-2">
                <MasteryBadge state={result.masteryState} />
              </div>
            </div>
          )}
          {error && <p className="text-danger">{error}</p>}
          <Button type="submit" disabled={pending || (!result && !answer.trim())}>
            {result ? "Next" : "Check"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
