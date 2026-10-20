import type { SkillDefinition } from "@/core/learning";

export const JA_SKILLS = {
  kanaReading: "ja.kana.reading",
  kanaWriting: "ja.kana.writing",
} as const;

export const japaneseSkills: readonly SkillDefinition[] = [
  {
    id: JA_SKILLS.kanaReading,
    label: "Kana reading",
    description: "See a kana character and recall its sound.",
    stage: "recall",
    capability: "character-recognition",
  },
  {
    id: JA_SKILLS.kanaWriting,
    label: "Kana writing",
    description: "Write a kana character by hand, progressing toward writing from memory.",
    stage: "production",
    capability: "character-writing",
  },
];
