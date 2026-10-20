import enCommon from "../../locales/en/common.json";
import enDashboard from "../../locales/en/dashboard.json";
import enLearning from "../../locales/en/learning.json";
import enPractice from "../../locales/en/practice.json";
import enProgress from "../../locales/en/progress.json";
import enReview from "../../locales/en/review.json";
import enSettings from "../../locales/en/settings.json";
import idCommon from "../../locales/id/common.json";
import idDashboard from "../../locales/id/dashboard.json";
import idLearning from "../../locales/id/learning.json";
import idPractice from "../../locales/id/practice.json";
import idProgress from "../../locales/id/progress.json";
import idReview from "../../locales/id/review.json";
import idSettings from "../../locales/id/settings.json";
import { listLanguageModules } from "@/languages/registry";
import type { Locale } from "./config";
import type { MessageTree } from "./translator";

/**
 * Platform messages per locale, one file per namespace in /locales.
 * Language modules contribute their own messages under their language code
 * (e.g. `ja.skills…`), so module-specific text stays inside the module.
 */
const platform = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    learning: enLearning,
    practice: enPractice,
    review: enReview,
    progress: enProgress,
    settings: enSettings,
  },
  id: {
    common: idCommon,
    dashboard: idDashboard,
    learning: idLearning,
    practice: idPractice,
    review: idReview,
    progress: idProgress,
    settings: idSettings,
  },
} satisfies Record<Locale, MessageTree>;

/** The shape every locale must provide; English is the reference. */
export type Messages = (typeof platform)["en"];

export function getMessages(locale: Locale): Messages & MessageTree {
  const modules = Object.fromEntries(
    listLanguageModules().map((m) => [m.code, (m.messages[locale] ?? m.messages.en ?? {}) as MessageTree]),
  );
  return { ...(platform[locale] as Messages), ...modules } as Messages & MessageTree;
}

export const platformMessages: Record<Locale, MessageTree> = platform;
