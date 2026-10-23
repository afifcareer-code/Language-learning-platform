import { notFound } from "next/navigation";
import { SessionPage } from "@/features/practice/session-page";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getPracticeSession, type SessionRequest } from "@/server/services/practice";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function toRequest(params: Record<string, string | string[] | undefined>): SessionRequest | null {
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const kind = get("kind");
  const skill = get("skill");
  if ((kind === "review" || kind === "weak") && skill) return { kind, skill };
  const level = get("level");
  const section = get("section");
  if (kind === "assessment" && level && section) return { kind, level, section };
  const a = get("a");
  const b = get("b");
  if (kind === "confusion" && a && b) return { kind, itemA: a, itemB: b };
  return null;
}

/** Sessions outside the curriculum: due reviews, recent mistakes, confusing pairs. */
export default async function FocusSessionPage({ searchParams }: Props) {
  const request = toRequest(await searchParams);
  if (!request) notFound();
  const { db, learner } = await getContext();
  const { locale, t } = await getI18n();
  const session = await getPracticeSession(db, learner, locale, request);
  if (!session) notFound();
  return <SessionPage session={session} db={db} learner={learner} t={t} />;
}
