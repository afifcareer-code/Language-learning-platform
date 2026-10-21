import type { LanguageModule } from "@/core/learning";
import en from "./locales/en.json";
import id from "./locales/id.json";
import { kanaIdForRomaji, knownConfusables } from "./scripts/catalog";
import { checkRomaji, isKanaItemData } from "./scripts/kana";
import { isSentenceData } from "./sentences/schema";
import { JA_SKILLS, japaneseSkills } from "./skills";
import { checkVocabularyAnswer } from "./vocabulary/answers";
import { isVocabularyData, vocabularyDisplay } from "./vocabulary/schema";

export const japanese: LanguageModule = {
  code: "ja",
  nativeName: "日本語",
  // Declare only what is implemented. Listening, speaking and kanji are
  // added here as their features land.
  capabilities: [
    "reading",
    "writing",
    "pronunciation",
    "character-recognition",
    "character-writing",
    "vocabulary",
    "grammar",
  ],
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
    if (skill === JA_SKILLS.vocabularyRecall && isVocabularyData(item.data)) {
      const correct = checkVocabularyAnswer(item.data, response);
      return {
        correct,
        score: correct ? 1 : 0,
        expected: `${vocabularyDisplay(item.data)} (${item.data.romaji})`,
      };
    }
    if (skill === JA_SKILLS.sentenceBuilding && isSentenceData(item.data)) {
      // The response is the arranged pieces, separated by spaces.
      const { tokens, text } = item.data;
      const arranged = response.trim().split(/\s+/);
      const correct = arranged.length === tokens.length && arranged.every((token, i) => token === tokens[i]);
      return { correct, score: correct ? 1 : 0, expected: text };
    }
    return null;
  },
  knownConfusables,
  isComparable: (a, b) =>
    a.type === b.type &&
    (!isKanaItemData(a.data) || (isKanaItemData(b.data) && a.data.script === b.data.script)),
};

export { JA_SKILLS } from "./skills";
export * from "./scripts/kana";
