import type { LanguageModule } from "@/core/learning";
import en from "./locales/en.json";
import id from "./locales/id.json";
import { kanaIdForRomaji, knownConfusables } from "./scripts/catalog";
import { checkRomaji, isKanaItemData } from "./scripts/kana";
import { JA_SKILLS, japaneseSkills } from "./skills";

export const japanese: LanguageModule = {
  code: "ja",
  nativeName: "日本語",
  // Declare only what is implemented. Vocabulary, grammar, listening, etc.
  // are added here as their features land.
  capabilities: ["reading", "writing", "pronunciation", "character-recognition", "character-writing"],
  skills: japaneseSkills,
  messages: { en, id },
  evaluateResponse(item, skill, response) {
    if (skill === JA_SKILLS.kanaReading && isKanaItemData(item.data)) {
      const correct = checkRomaji(item.data, response);
      const other = correct ? undefined : kanaIdForRomaji(item.data.script, response);
      return {
        correct,
        score: correct ? 1 : 0,
        expected: item.data.romaji,
        confusedWithItemId: other && other !== item.id ? other : undefined,
      };
    }
    return null;
  },
  knownConfusables,
  isComparable: (a, b) => isKanaItemData(a.data) && isKanaItemData(b.data) && a.data.script === b.data.script,
};

export { JA_SKILLS } from "./skills";
export * from "./scripts/kana";
