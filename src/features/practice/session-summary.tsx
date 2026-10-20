"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface SessionOutcome {
  id: string;
  label: string;
  correct: boolean;
}

export function SessionSummary({ outcomes }: { outcomes: SessionOutcome[] }) {
  const router = useRouter();
  const correct = outcomes.filter((o) => o.correct).length;
  const missed = outcomes.filter((o) => !o.correct);
  return (
    <Card className="mx-auto max-w-xl text-center">
      <p className="text-sm text-muted">Session complete</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums">
        {correct} / {outcomes.length}
      </p>
      <p className="mt-1 text-muted">correct</p>
      {missed.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-muted">To revisit</p>
          <p lang="ja" className="mt-2 font-jp text-3xl tracking-widest">
            {missed.map((m) => m.label).join(" ")}
          </p>
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={() => router.refresh()}>
          Practise again
        </Button>
        <ButtonLink href="/">Done</ButtonLink>
      </div>
    </Card>
  );
}
