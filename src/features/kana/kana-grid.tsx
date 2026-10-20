import type { MasteryState } from "@/core/mastery";
import { cn } from "@/shared/cn";
import { MASTERY_TONE } from "@/shared/labels";
import type { KanaView } from "./kana-view";

export function KanaGrid({
  items,
  states,
  labels,
}: {
  items: KanaView[];
  states?: Record<string, MasteryState>;
  labels?: Record<MasteryState, string>;
}) {
  return (
    <ul className="grid grid-cols-5 gap-2 sm:gap-3">
      {items.map((item) => {
        const state = states?.[item.id];
        const label = state && labels ? labels[state] : undefined;
        return (
          <li
            key={item.id}
            className={cn(
              "flex aspect-square flex-col items-center justify-center rounded-xl border border-line",
              state ? MASTERY_TONE[state] : "bg-surface",
            )}
            title={label}
          >
            <span lang="ja" className="font-jp text-3xl leading-none sm:text-4xl">
              {item.kana}
            </span>
            <span className="mt-1 text-xs opacity-80">{item.romaji}</span>
            {label && <span className="sr-only">{label}</span>}
          </li>
        );
      })}
    </ul>
  );
}
