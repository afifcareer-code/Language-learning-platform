import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { KanjiBrowser, type KanjiGroup } from "@/features/japanese/kanji-browser";
import {
  isKanjiData,
  KANJI_CONTENT_TYPE,
  KANJI_VIEWBOX,
  type KanjiTranslation,
} from "@/languages/japanese/kanji/schema";
import { getI18n } from "@/localization/server";
import { getContext } from "@/server/context";
import { getContentTranslations, listContentItemsByType } from "@/server/repositories/content";
import { getPracticeLevels } from "@/server/services/practice-level";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("learning.kanji.title") };
}

/** Kanji reference: meaning, readings and stroke order of every kanji, by level. */
export default async function KanjiPage() {
  const { db, learner } = await getContext();
  const { t } = await getI18n();
  if (learner.targetLanguage !== "ja") notFound();
  const items = (await listContentItemsByType(db, "ja", KANJI_CONTENT_TYPE)).filter((i) =>
    isKanjiData(i.data),
  );
  const translations = await getContentTranslations(
    db,
    items.map((i) => i.id),
    t.locale,
  );
  const levels = await getPracticeLevels(db, learner);
  const groups = new Map<string, KanjiGroup>();
  for (const item of [...items].sort((a, b) => levels.orderOf(a) - levels.orderOf(b))) {
    if (!isKanjiData(item.data)) continue;
    const code = levels.codeOf(item) ?? "";
    const group = groups.get(code) ?? { level: code, open: levels.allows(item), kanji: [] };
    group.kanji.push({
      id: item.id,
      character: item.data.character,
      meaning: (translations.get(item.id) as KanjiTranslation | undefined)?.meaning ?? "",
      onyomi: item.data.onyomi,
      kunyomi: item.data.kunyomi,
      strokes: item.data.strokes,
    });
    groups.set(code, group);
  }
  return (
    <>
      <PageHeader title={t("learning.kanji.title")} description={t("learning.kanji.description")} />
      <KanjiBrowser groups={[...groups.values()]} viewBox={KANJI_VIEWBOX} />
      <p className="mt-8 text-xs text-muted">{t("learning.kanji.credit")}</p>
    </>
  );
}
