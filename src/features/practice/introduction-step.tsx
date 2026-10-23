"use client";

import { useState } from "react";
import { useSpeech } from "@/audio/use-speech";
import { Button } from "@/components/ui/button";
import { SpeakerIcon } from "@/components/icons";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";

/** One character to introduce. All fields come from the content data. */
export interface IntroductionItem {
  id: string;
  display: string;
  displayLang: string;
  /** What it is read as, e.g. romaji for kana. */
  reading: string;
  /** Text to speak, and its language. */
  speech: string;
  speechLang: string;
}

/** Characters per screen: enough to see the set, few enough to look at each one. */
const GROUP_SIZE = 5;

/**
 * Teaching, not assessment: shows each character together with its sound and
 * lets the learner hear it, before any question about it. Nothing here is
 * answered, scored or recorded as an attempt.
 */
export function IntroductionStep({ items, onDone }: { items: IntroductionItem[]; onDone: () => void }) {
  const t = useT();
  const lang = items[0]?.speechLang ?? "ja";
  const speech = useSpeech(lang);
  const [group, setGroup] = useState(0);
  const groups = Math.ceil(items.length / GROUP_SIZE);
  const from = group * GROUP_SIZE;
  const shown = items.slice(from, from + GROUP_SIZE);
  const last = group >= groups - 1;
  const canPlay = speech.status === "ready";

  return (
    <section aria-labelledby="introduction-title" className="text-left">
      <h2 id="introduction-title" className="text-xl font-semibold">
        {t("practice.introduction.title")}
      </h2>
      <p className="mt-1 text-muted">{t("practice.introduction.prompt")}</p>
      {speech.status === "unavailable" && (
        <p role="note" className="mt-2 text-sm text-muted">
          {t("practice.introduction.noAudio")}
        </p>
      )}

      <ul className="mt-5 grid gap-3">
        {shown.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3"
          >
            <span lang={item.displayLang} className="font-jp w-16 shrink-0 text-center text-5xl leading-none">
              {item.display}
            </span>
            <span className="min-w-0 flex-1 text-lg">
              {t("practice.introduction.readAs", { character: item.display, reading: item.reading })}
            </span>
            {canPlay && (
              <button
                type="button"
                onClick={() => speech.speak(item.speech)}
                aria-label={t("common.audio.play", { text: item.display })}
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-accent",
                  "bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-accent-ink",
                )}
              >
                <SpeakerIcon width={24} height={24} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col gap-2">
        {groups > 1 && (
          <p className="text-sm text-muted">
            {t("practice.introduction.group", {
              from: from + 1,
              to: from + shown.length,
              total: items.length,
            })}
          </p>
        )}
        <Button autoFocus onClick={() => (last ? onDone() : setGroup((g) => g + 1))} className="w-full">
          {last ? t("practice.introduction.start") : t("practice.introduction.next")}
        </Button>
      </div>
    </section>
  );
}
