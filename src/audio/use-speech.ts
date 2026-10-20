"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Text-to-speech via the browser's Web Speech API.
 * `supported` is false when no voice exists for the language, so callers can
 * hide audio controls instead of offering something that will not work.
 */
export function useSpeech(lang: string) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      const prefix = lang.toLowerCase();
      setVoice(
        window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null,
      );
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pick);
  }, [lang]);

  const speak = useCallback(
    (text: string) => {
      if (!voice) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    },
    [voice],
  );

  return { supported: voice !== null, speak };
}
