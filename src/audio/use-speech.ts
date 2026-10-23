"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * - `checking`: browsers load their voices asynchronously, so we do not know yet.
 * - `ready`: audio clips or a device voice exist for the language and `speak` will play one.
 * - `unavailable`: neither clips nor a voice for the language on this device.
 */
export type SpeechStatus = "checking" | "ready" | "unavailable";

type Clips = Readonly<Record<string, string>>;
const clipCache = new Map<string, Promise<Clips>>();

/** The text → file map of the audio clips shipped for a language (empty when there are none). */
function loadClips(lang: string): Promise<Clips> {
  let promise = clipCache.get(lang);
  if (!promise) {
    promise = fetch(`/audio/${lang}/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Clips>) : {}))
      .catch(() => ({}));
    clipCache.set(lang, promise);
  }
  return promise;
}

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
 * Plays the shipped audio clip for a text when there is one (synthesised with
 * an open-source voice, see public/audio/CREDITS.md), and otherwise speaks it
 * with a voice installed on the learner's device through the Web Speech API.
 * Clips make audio work on devices without a Japanese voice.
 *
 * Callers must not offer audio-only questions unless `status` is "ready", and
 * must show an honest fallback when it is "unavailable".
 */
export function useSpeech(lang: string): Speech {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [status, setStatus] = useState<SpeechStatus>("checking");
  const [speaking, setSpeaking] = useState(false);
  const [clips, setClips] = useState<Clips | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadClips(lang).then((found) => {
      if (cancelled) return;
      setClips(found);
      if (Object.keys(found).length > 0) setStatus("ready");
    });
    return () => {
      cancelled = true;
      player.current?.pause();
    };
  }, [lang]);

  useEffect(() => {
    if (!window.speechSynthesis) {
      // No speech API at all: report it from a callback, not synchronously in the effect.
      const none = window.setTimeout(() => setStatus((s) => (s === "ready" ? s : "unavailable")), 0);
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
      const file = clips?.[text];
      const speakWithVoice = () => {
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
      };
      if (file) {
        player.current?.pause();
        window.speechSynthesis?.cancel();
        const audio = new Audio(`/audio/${lang}/${file}`);
        player.current = audio;
        audio.onplaying = () => setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => {
          setSpeaking(false);
          speakWithVoice();
        };
        audio.play().catch(() => {
          setSpeaking(false);
          speakWithVoice();
        });
        return;
      }
      speakWithVoice();
    },
    [clips, voice, lang],
  );

  const stop = useCallback(() => {
    player.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return {
    status,
    supported: voice !== null || (clips !== null && Object.keys(clips).length > 0),
    speaking,
    speak,
    stop,
  };
}
