"use client";

import { useSpeech } from "@/audio/use-speech";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import { KanaGrid } from "./kana-grid";
import type { KanaView } from "./kana-view";

/**
 * The characters of a lesson, each one a button that plays its sound. This is
 * the exposure step before recognition: the learner hears every sound here
 * before being asked to pick a character from a sound. Without a voice on the
 * device it is the plain grid, with no controls that cannot work.
 */
export function PlayableKanaGrid({ items }: { items: KanaView[] }) {
  const t = useT();
  const speech = useSpeech("ja");
  if (speech.status !== "ready") return <KanaGrid items={items} />;

  return (
    <>
      <ul className="grid grid-cols-5 gap-2 sm:gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => speech.speak(item.kana)}
              aria-label={t("common.audio.play", { text: item.kana })}
              className={cn(
                "flex aspect-square w-full flex-col items-center justify-center rounded-xl border border-line bg-surface",
                "transition-colors hover:border-accent hover:bg-accent-soft",
              )}
            >
              <span lang="ja" className="font-jp text-3xl leading-none sm:text-4xl">
                {item.kana}
              </span>
              <span className="mt-1 text-xs opacity-80">{item.romaji}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">{t("learning.lesson.tapToHear")}</p>
    </>
  );
}
