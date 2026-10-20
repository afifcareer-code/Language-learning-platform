import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getContext } from "@/server/context";
import { FALLBACK_LOCALE, isLocale, negotiateLocale, type Locale } from "./config";
import { getMessages, type Messages } from "./messages";
import { createTranslator, type Translator } from "./translator";

function defaultLocale(): Locale {
  const configured = process.env.DEFAULT_LOCALE;
  return isLocale(configured) ? configured : FALLBACK_LOCALE;
}

/**
 * The UI locale for this request: the learner's saved preference, else the
 * browser's Accept-Language, else DEFAULT_LOCALE.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const { learner } = await getContext();
  if (isLocale(learner.uiLocale)) return learner.uiLocale;
  return negotiateLocale((await headers()).get("accept-language")) ?? defaultLocale();
});

export const getI18n = cache(
  async (): Promise<{ locale: Locale; messages: Messages; t: Translator<Messages> }> => {
    const locale = await getLocale();
    const messages = getMessages(locale);
    return { locale, messages, t: createTranslator(locale, messages, getMessages(FALLBACK_LOCALE)) };
  },
);
