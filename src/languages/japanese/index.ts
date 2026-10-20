import type { LanguageModule } from "@/core/learning";
import { checkRomaji, isKanaItemData } from "./scripts/kana";
import { JA_SKILLS, japaneseSkills } from "./skills";

export const japanese: LanguageModule = {
  code: "ja",
  name: "Japanese",
  nativeName: "日本語",
  // Declare only what is implemented. Vocabulary, grammar, listening, etc.
  // are added here as their features land.
  capabilities: ["reading", "writing", "pronunciation", "character-recognition", "character-writing"],
  skills: japaneseSkills,
  evaluateResponse(item, skill, response) {
    if (skill === JA_SKILLS.kanaReading && isKanaItemData(item.data)) {
      const correct = checkRomaji(item.data, response);
      return { correct, score: correct ? 1 : 0, expected: item.data.romaji };
    }
    return null;
  },
};

export { JA_SKILLS } from "./skills";
export * from "./scripts/kana";
