import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { toKanaViews } from "@/features/kana/kana-view";
import { toPracticeParams } from "@/features/practice/practice-page-params";
import { ReadingSession } from "@/features/practice/reading-session";
import { JA_SKILLS } from "@/languages/japanese";
import { getContext } from "@/server/context";
import { getPracticeSet } from "@/server/services/practice";

export const metadata: Metadata = { title: "Reading practice" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ReadingPracticePage({ searchParams }: Props) {
  const { db, learner } = await getContext();
  const set = await getPracticeSet(db, learner, JA_SKILLS.kanaReading, toPracticeParams(await searchParams));
  const items = toKanaViews(set.items);

  return (
    <>
      <PageHeader title={`Kana reading · ${set.title}`} />
      {items.length ? (
        <ReadingSession
          key={randomUUID()}
          items={items}
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
