import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SessionPage } from "@/features/practice/session-page";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getPracticeSession } from "@/server/services/practice";

type Props = { params: Promise<{ activityId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { db, learner } = await getContext();
  const { locale } = await getI18n();
  const session = await getPracticeSession(db, learner, locale, {
    kind: "activity",
    activityId: (await params).activityId,
  });
  return { title: session?.activity?.text.title };
}

export default async function ActivityPage({ params }: Props) {
  const { activityId } = await params;
  const { db, learner } = await getContext();
  const { locale, t } = await getI18n();
  const session = await getPracticeSession(db, learner, locale, { kind: "activity", activityId });
  if (!session) notFound();
  return <SessionPage session={session} db={db} learner={learner} t={t} />;
}
