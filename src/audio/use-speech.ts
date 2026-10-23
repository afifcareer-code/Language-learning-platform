"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * - `checking`: browsers load their voices asynchronously, so we do not know yet.
 * - `ready`: a voice for the language exists and `speak` will play it.
 * - `unavailable`: no voice for the language on this device (or no speech API).
 */
export type SpeechStatus = "checking" | "ready" | "unavailable";

/** How long to wait for the browser to report its voices before giving up. */
const VOICE_WAIT_MS = 1500;

export interface Speech {
  status: SpeechStatus;
  /** True once a voice exists. Kept for callers that only need a yes/no. */
  supported: boolean;
  /** True while an utterance started by `speak` is playing. */
  speaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
}

/**
 * Text-to-speech via the browser's Web Speech API. There are no recorded
 * audio files yet, so every sound comes from a voice installed on the
 * learner's device.
 *
 * Callers must not offer audio-only questions unless `status` is "ready", and
 * must show an honest fallback when it is "unavailable".
 */
export function useSpeech(lang: string): Speech {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [status, setStatus] = useState<SpeechStatus>("checking");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!window.speechSynthesis) {
      // No speech API at all: report it from a callback, not synchronously in the effect.
      const none = window.setTimeout(() => setStatus("unavailable"), 0);
      return () => window.clearTimeout(none);
    }
    const synth = window.speechSynthesis;
    const prefix = lang.toLowerCase();
    const pick = () => {
      const found = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;
      setVoice(found);
      if (found) setStatus("ready");
    };
    pick();
    synth.addEventListener("voiceschanged", pick);
    const giveUp = window.setTimeout(() => {
      setStatus((s) => (s === "checking" ? "unavailable" : s));
    }, VOICE_WAIT_MS);
    return () => {
      synth.removeEventListener("voiceschanged", pick);
      window.clearTimeout(giveUp);
      synth.cancel();
    };
  }, [lang]);

  const speak = useCallback(
    (text: string) => {
      if (!voice) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.8;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      synth.speak(utterance);
    },
    [voice],
  );

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { status, supported: voice !== null, speaking, speak, stop };
}
