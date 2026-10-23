"use client";

import { useState } from "react";
import { SpeakerIcon } from "@/components/icons";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import type { Speech } from "./use-speech";

/**
 * A labelled audio control for exercises where the sound is the question.
 *
 * - `primary`: the dominant interaction of the screen (large, touch-friendly).
 * - `compact`: a replay control inside feedback.
 *
 * The accessible name is the visible label only. It never contains the text
 * being spoken, because that text is the answer to the question.
 */
export function AudioPlayButton({
  speech,
  text,
  variant = "primary",
  idleLabel,
  className,
}: {
  speech: Speech;
  /** What to speak. Resolved by the caller from the current item's data. */
  text: string;
  variant?: "primary" | "compact";
  /** Label before the first play, instead of "Play sound" (feedback says "Listen again"). */
  idleLabel?: string;
  className?: string;
}) {
  const t = useT();
  const [played, setPlayed] = useState(false);
  const checking = speech.status === "checking";

  const label = checking
    ? t("common.audio.preparing")
    : speech.speaking
      ? t("common.audio.playing")
      : played
        ? t("common.audio.playAgain")
        : (idleLabel ?? t("common.audio.playSound"));

  return (
    <button
      type="button"
      disabled={speech.status !== "ready"}
      aria-busy={checking || speech.speaking}
      onClick={() => {
        setPlayed(true);
        speech.speak(text);
      }}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "mx-auto min-h-28 w-full max-w-xs flex-col gap-2 rounded-2xl border-2 border-accent px-6 py-4 text-lg",
        variant === "primary" &&
          (speech.speaking
            ? "bg-accent text-accent-ink"
            : "bg-accent-soft text-accent hover:bg-accent hover:text-accent-ink"),
        variant === "compact" &&
          "min-h-12 gap-2 rounded-xl border border-line bg-surface px-4 text-base text-ink hover:bg-sunken",
        className,
      )}
    >
      <SpeakerIcon width={variant === "primary" ? 40 : 24} height={variant === "primary" ? 40 : 24} />
      <span>{label}</span>
    </button>
  );
}
