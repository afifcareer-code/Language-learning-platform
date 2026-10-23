import type { SkillDefinition } from "@/core/learning";

export const JA_SKILLS = {
  kanaRecognition: "ja.kana.recognition",
  kanaReading: "ja.kana.reading",
  kanaWriting: "ja.kana.writing",
  vocabularyRecognition: "ja.vocab.recognition",
  vocabularyRecall: "ja.vocab.recall",
  sentenceBuilding: "ja.grammar.sentence",
  sentenceReading: "ja.reading.sentence",
  sentenceListening: "ja.listening.sentence",
} as const;

/** Ordered along the learning loop within each area. Labels live in ./locales. */
export const japaneseSkills: readonly SkillDefinition[] = [
  { id: JA_SKILLS.kanaRecognition, stage: "recognition", capability: "character-recognition" },
  { id: JA_SKILLS.kanaReading, stage: "recall", capability: "character-recognition" },
  { id: JA_SKILLS.kanaWriting, stage: "production", capability: "character-writing" },
  { id: JA_SKILLS.vocabularyRecognition, stage: "recognition", capability: "vocabulary" },
  { id: JA_SKILLS.vocabularyRecall, stage: "recall", capability: "vocabulary" },
  { id: JA_SKILLS.sentenceBuilding, stage: "production", capability: "grammar" },
  { id: JA_SKILLS.sentenceReading, stage: "understanding", capability: "reading" },
  { id: JA_SKILLS.sentenceListening, stage: "understanding", capability: "listening" },
];
