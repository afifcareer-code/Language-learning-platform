"use client";

import { SpeakerIcon } from "@/components/icons";
import { useT } from "@/localization/client";
import { cn } from "@/shared/cn";
import { useSpeech } from "./use-speech";

export function SpeakButton({ text, lang, className }: { text: string; lang: string; className?: string }) {
  const t = useT();
  const { supported, speak } = useSpeech(lang);
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-ink",
        className,
      )}
      aria-label={t("common.audio.play", { text })}
    >
      <SpeakerIcon />
    </button>
  );
}
