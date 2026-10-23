"use client";

import { useState } from "react";
import { StrokeOrder } from "@/components/learning/stroke-order";
import { Card } from "@/components/ui/card";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";

export interface KanjiView {
  id: string;
  character: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  strokes: string[];
}

export interface KanjiGroup {
  level: string;
  /** The learner can practise this level now. */
  open: boolean;
  kanji: KanjiView[];
}

/** Every kanji by level; choosing one shows its meaning, readings and how it is written. */
export function KanjiBrowser({ groups, viewBox }: { groups: KanjiGroup[]; viewBox: number }) {
  const t = useT();
  const [selected, setSelected] = useState<KanjiView | null>(groups[0]?.kanji[0] ?? null);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.level} aria-labelledby={`kanji-${g.level}`}>
            <h2 id={`kanji-${g.level}`} className="text-xl font-semibold">
              {t("learning.kanji.level", { level: g.level, count: g.kanji.length })}
            </h2>
            {!g.open && (
              <p className="mt-1 text-sm text-muted">{t("learning.kanji.notYet", { level: g.level })}</p>
            )}
            <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
              {g.kanji.map((k) => (
                <li key={k.id}>
                  <button
                    type="button"
                    lang="ja"
                    aria-label={`${k.character} · ${k.meaning}`}
                    aria-pressed={selected?.id === k.id}
                    onClick={() => setSelected(k)}
                    className={cn(
                      "font-jp flex aspect-square w-full min-h-11 items-center justify-center rounded-lg border text-2xl",
                      selected?.id === k.id
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-paper hover:border-accent",
                    )}
                  >
                    {k.character}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {selected && (
        <Card className="flex flex-col items-center gap-3 lg:sticky lg:top-6" data-testid="kanji-detail">
          <p lang="ja" className="font-jp text-6xl leading-none">
            {selected.character}
          </p>
          <p className="text-lg font-medium">{selected.meaning}</p>
          <dl className="grid w-full grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">{t("learning.kanji.onyomi")}</dt>
            <dd lang="ja">{selected.onyomi.join("・") || "—"}</dd>
            <dt className="text-muted">{t("learning.kanji.kunyomi")}</dt>
            <dd lang="ja">{selected.kunyomi.join("・") || "—"}</dd>
            <dt className="text-muted">{t("learning.kanji.strokes")}</dt>
            <dd>{selected.strokes.length}</dd>
          </dl>
          <StrokeOrder
            key={selected.id}
            strokes={selected.strokes}
            viewBox={viewBox}
            label={t("practice.writing.strokeOrderLabel", {
              character: selected.character,
              count: selected.strokes.length,
            })}
            replayLabel={t("practice.writing.replay")}
            size={200}
          />
        </Card>
      )}
    </div>
  );
}
