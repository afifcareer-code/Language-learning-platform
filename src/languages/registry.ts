import type { LanguageCode, LanguageModule } from "@/core/learning";
import { japanese } from "./japanese";

/** All installed language modules. Japanese is the first and currently only one. */
const modules: ReadonlyMap<LanguageCode, LanguageModule> = new Map([[japanese.code, japanese]]);

export function getLanguageModule(code: LanguageCode): LanguageModule {
  const languageModule = modules.get(code);
  if (!languageModule) throw new Error(`No language module registered for "${code}"`);
  return languageModule;
}

export function listLanguageModules(): LanguageModule[] {
  return [...modules.values()];
}
