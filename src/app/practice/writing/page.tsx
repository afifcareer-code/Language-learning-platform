import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { toKanaViews } from "@/features/kana/kana-view";
import { toPracticeParams } from "@/features/practice/practice-page-params";
import { WritingSession, type WritingPrompt } from "@/features/practice/writing-session";
import { writingStageFor } from "@/handwriting/guidance";
import { JA_SKILLS } from "@/languages/japanese";
import { getContext } from "@/server/context";
import { getLearnerProgress, progressKey } from "@/server/repositories/progress";
import { getPracticeSet } from "@/server/services/practice";

export const metadata: Metadata = { title: "Writing practice" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function WritingPracticePage({ searchParams }: Props) {
  const { db, learner } = await getContext();
  const [set, progress] = await Promise.all([
    getPracticeSet(db, learner, JA_SKILLS.kanaWriting, toPracticeParams(await searchParams)),
    getLearnerProgress(db, learner.id),
  ]);

  // The guide each item gets depends on the learner's writing mastery of it.
  const prompts: WritingPrompt[] = toKanaViews(set.items).map((k) => ({
    ...k,
    stage: writingStageFor(progress.get(progressKey(k.id, JA_SKILLS.kanaWriting))?.state ?? "not_started"),
  }));

  return (
    <>
      <PageHeader title={`Kana writing · ${set.title}`} />
      {prompts.length ? (
        <WritingSession
          key={randomUUID()}
          prompts={prompts}
          mode={set.mode === "review" ? "review" : "practice"}
        />
      ) : (
        <EmptyState title="Nothing to practise here">
          There are no items for this session right now.
        </EmptyState>
      )}
    </>
  );
}
