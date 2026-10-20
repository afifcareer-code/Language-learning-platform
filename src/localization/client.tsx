"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages";
import { createTranslator, type MessageTree, type Translator } from "./translator";

const I18nContext = createContext<Translator<Messages> | null>(null);

/** Makes the request's messages available to client components. */
export function I18nProvider({
  locale,
  messages,
  fallbackMessages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  fallbackMessages?: MessageTree;
  children: ReactNode;
}) {
  const t = useMemo(
    () => createTranslator(locale, messages as Messages & MessageTree, fallbackMessages),
    [locale, messages, fallbackMessages],
  );
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export function useT(): Translator<Messages> {
  const t = useContext(I18nContext);
  if (!t) throw new Error("useT must be used inside <I18nProvider>");
  return t;
}
