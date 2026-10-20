import type { SkillDefinition } from "@/core/learning";

export const JA_SKILLS = {
  kanaRecognition: "ja.kana.recognition",
  kanaReading: "ja.kana.reading",
  kanaWriting: "ja.kana.writing",
} as const;

/** Ordered along the learning loop: recognize → recall → produce. Labels live in ./locales. */
export const japaneseSkills: readonly SkillDefinition[] = [
  { id: JA_SKILLS.kanaRecognition, stage: "recognition", capability: "character-recognition" },
  { id: JA_SKILLS.kanaReading, stage: "recall", capability: "character-recognition" },
  { id: JA_SKILLS.kanaWriting, stage: "production", capability: "character-writing" },
];
