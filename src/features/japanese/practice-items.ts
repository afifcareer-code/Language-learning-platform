import { JA_SKILLS } from "@/languages/japanese/skills";
import type { ContentItem } from "@/core/learning";
import type { WritingStage } from "@/handwriting/guidance";
import { acceptedStrokeCounts, isKanaItemData, type KanaItemData } from "@/languages/japanese";
import { isGrammarData, type GrammarTranslation } from "@/languages/japanese/grammar/schema";
import { isPassageData, passageSpeech, type PassageTranslation } from "@/languages/japanese/passages/schema";
import { isSentenceData, type SentenceTranslation } from "@/languages/japanese/sentences/schema";
import { isNativeData, tatoebaSentenceUrl, type NativeTranslation } from "@/languages/japanese/native/schema";
import { isSituationData, type SituationTranslation } from "@/languages/japanese/situations/schema";
import {
  isVocabularyData,
  vocabularyDisplay,
  type VocabularyTranslation,
} from "@/languages/japanese/vocabulary/schema";
import { shuffle } from "@/shared/format";

/**
 * Adapters from Japanese content to the view models used by the
 * language-agnostic practice components. Only this layer knows how a kana,
 * a word or a sentence is shown.
 */

/** What a practice component needs to show one prompt. Serializable. */
export interface PracticeItem {
  id: string;
  /** The prompt: a character, a word, or a meaning to express. */
  display: string;
  /** BCP 47 tag of `display`, for fonts, screen readers and speech. */
  displayLang: string;
  /** "glyph": one large character; "word": a short Japanese word; "text": a sentence or meaning. */
  displayStyle: "glyph" | "word" | "text";
  /** Text to speak for this item (always Japanese), when audio helps. */
  speech: string;
  /** BCP 47 tag of `speech`. Components never assume the language. */
  speechLang: string;
  /**
   * The sound of the item in romaji (kana only), for feedback such as "あ = a".
   * Empty when the item has no single reading.
   */
  reading: string;
  /**
   * Recognition asks "which character is this sound?": the sound is played and the
   * character is not shown before answering. Only kana are asked this way today.
   */
  audioPrompt: boolean;
  /** What the options are: the character that was heard, or the meaning of what was read or heard. */
  answerKind: "character" | "meaning";
  /** For writing: the cue the learner writes from, and what kind of character to write. */
  cue: string;
  cueKind: string;
  strokeCounts: number[];
  stage: WritingStage;
  /** `label` is what the option means (a sound or a meaning); `glyph` is the character itself, for kana. */
  choices: { id: string; label: string; glyph: string }[];
  /** For sentence building: the pieces to arrange, shuffled. */
  tokens: string[];
  /** For comprehension: the text or dialogue lines, the question and the shuffled options (with their original index). */
  /** Where the item comes from, when it must be credited (CC BY). */
  attribution: {
    source: string;
    license: string;
    url: string;
    sentenceId: number;
    sentenceAuthor: string;
    translationId: number;
    translationAuthor: string;
  } | null;
  passage: {
    form: "text" | "dialogue";
    lines: string[];
    question: string;
    options: { index: number; text: string }[];
  } | null;
}

/** The text that represents an item, e.g. "あ", "〜さん", or a sentence. */
export function itemDisplay(item: ContentItem | undefined): string {
  if (!item) return "";
  if (isKanaItemData(item.data)) return item.data.kana;
  if (isVocabularyData(item.data)) return vocabularyDisplay(item.data);
  if (isNativeData(item.data)) return item.data.text;
  if (isSentenceData(item.data)) return item.data.text;
  if (isGrammarData(item.data)) return item.data.pattern;
  return item.key;
}

/** The answer label for a choice option: a kana's sound or a word's meaning. */
export function choiceLabel(item: ContentItem, translation: unknown): string {
  if (isKanaItemData(item.data)) return item.data.romaji;
  if (isVocabularyData(item.data))
    return (translation as VocabularyTranslation | undefined)?.meaning ?? item.data.romaji;
  if (isNativeData(item.data))
    return (translation as NativeTranslation | undefined)?.translation ?? item.data.text;
  if (isSentenceData(item.data))
    return (translation as SentenceTranslation | undefined)?.translation ?? item.data.text;
  return itemDisplay(item);
}

/** The character an option shows when the question is "which character?" (kana only). */
export function choiceGlyph(item: ContentItem, translation?: unknown): string {
  if (isSentenceData(item.data) || isNativeData(item.data)) return choiceLabel(item, translation);
  return isKanaItemData(item.data) ? item.data.kana : "";
}

/** What the learner should have answered, shown in feedback. */
export function expectedAnswer(
  item: ContentItem,
  skillType: "choice" | "other",
  translation: unknown,
): string {
  if (skillType === "choice") return choiceLabel(item, translation);
  if (isVocabularyData(item.data)) return `${vocabularyDisplay(item.data)} (${item.data.romaji})`;
  if (isKanaItemData(item.data)) return item.data.romaji;
  return itemDisplay(item);
}

export function toPracticeItem(
  item: ContentItem,
  options: {
    kind: "recognition" | "recall" | "writing" | "sentence" | "production";
    /** The skill being practised, to tell reading from listening on the same sentences. */
    skill?: string;
    locale: string;
    translation: unknown;
    choiceItems: { item: ContentItem; translation: unknown }[];
    stage: WritingStage;
    scriptName: (script: KanaItemData["script"]) => string;
  },
): PracticeItem | null {
  const base = {
    id: item.id,
    cue: "",
    cueKind: "",
    strokeCounts: [] as number[],
    stage: options.stage,
    choices: options.choiceItems.map((c) => ({
      id: c.item.id,
      label: choiceLabel(c.item, c.translation),
      glyph: choiceGlyph(c.item, c.translation),
    })),
    speechLang: "ja",
    reading: "",
    audioPrompt: false,
    answerKind: "character" as const,
    tokens: [] as string[],
    passage: null,
    attribution: null,
  };

  if (isPassageData(item.data)) {
    const c = options.translation as PassageTranslation | undefined;
    const speech = passageSpeech(item.data);
    return {
      ...base,
      display: speech,
      displayLang: "ja",
      displayStyle: "text",
      speech,
      audioPrompt: item.data.form === "dialogue",
      answerKind: "meaning" as const,
      passage: {
        form: item.data.form,
        lines: item.data.lines.map((l) => l.text),
        question: c?.question ?? "",
        options: shuffle((c?.options ?? []).map((text, index) => ({ index, text }))),
      },
    };
  }
  if (isSituationData(item.data)) {
    const prompt = (options.translation as SituationTranslation | undefined)?.prompt ?? item.data.model;
    return {
      ...base,
      display: item.data.model,
      displayLang: "ja",
      displayStyle: "word",
      speech: item.data.model,
      cue: prompt,
      cueKind: item.data.kind,
    };
  }
  if (isKanaItemData(item.data)) {
    return {
      ...base,
      display: item.data.kana,
      displayLang: "ja",
      displayStyle: "glyph",
      speech: item.data.kana,
      reading: item.data.romaji,
      audioPrompt: options.kind === "recognition",
      cue: item.data.romaji,
      cueKind: options.scriptName(item.data.script),
      strokeCounts: acceptedStrokeCounts(item.data),
    };
  }
  if (isVocabularyData(item.data)) {
    const meaning = (options.translation as VocabularyTranslation | undefined)?.meaning ?? item.data.romaji;
    // Writing by hand: the meaning is the cue and the word in kana is the model to compare with.
    if (options.kind === "production") {
      return {
        ...base,
        display: item.data.kana,
        displayLang: "ja",
        displayStyle: "word",
        speech: item.data.kana,
        cue: meaning,
        cueKind: "word",
      };
    }
    // Recognition shows the word; recall shows the meaning and asks for the word.
    return options.kind === "recall"
      ? {
          ...base,
          display: meaning,
          displayLang: options.locale,
          displayStyle: "text",
          speech: item.data.kana,
        }
      : {
          ...base,
          display: vocabularyDisplay(item.data),
          displayLang: "ja",
          displayStyle: "word",
          speech: item.data.kana,
          // Word listening plays the word and shows nothing; the options are meanings.
          audioPrompt: options.skill === JA_SKILLS.wordListening,
          answerKind: options.skill === JA_SKILLS.wordListening ? ("meaning" as const) : base.answerKind,
        };
  }
  if (isNativeData(item.data)) {
    const source = item.data.source;
    const translationCredit = source.translations[options.locale] ?? source.translations.en!;
    return {
      ...base,
      display: item.data.text,
      displayLang: "ja",
      displayStyle: "word",
      speech: item.data.text,
      audioPrompt: options.skill === JA_SKILLS.nativeListening,
      answerKind: "meaning" as const,
      attribution: {
        source: source.name,
        license: source.license,
        url: tatoebaSentenceUrl(source.sentence.id),
        sentenceId: source.sentence.id,
        sentenceAuthor: source.sentence.author,
        translationId: translationCredit.id,
        translationAuthor: translationCredit.author,
      },
    };
  }
  if (isSentenceData(item.data) && options.kind === "recognition") {
    // Reading shows the sentence; listening plays it and shows nothing (the text is the fallback
    // when the device cannot play audio). Either way the options are meanings.
    return {
      ...base,
      display: item.data.text,
      displayLang: "ja",
      displayStyle: "word",
      speech: item.data.text,
      audioPrompt: options.skill === JA_SKILLS.sentenceListening,
      answerKind: "meaning" as const,
    };
  }
  if (isSentenceData(item.data) && options.kind === "production") {
    const translation =
      (options.translation as SentenceTranslation | undefined)?.translation ?? item.data.text;
    return {
      ...base,
      display: item.data.text,
      displayLang: "ja",
      displayStyle: "word",
      speech: item.data.text,
      cue: translation,
      cueKind: "sentence",
    };
  }
  if (isSentenceData(item.data)) {
    const translation =
      (options.translation as SentenceTranslation | undefined)?.translation ?? item.data.text;
    return {
      ...base,
      display: translation,
      displayLang: options.locale,
      displayStyle: "text",
      speech: item.data.text,
      tokens: shuffleUntilDifferent(item.data.tokens),
    };
  }
  return null;
}

/** Shuffle pieces so the answer is never already in order. */
function shuffleUntilDifferent(tokens: string[]): string[] {
  for (let i = 0; i < 10; i++) {
    const shuffled = shuffle(tokens);
    if (shuffled.some((t, j) => t !== tokens[j])) return shuffled;
  }
  return [...tokens].reverse();
}

export type { GrammarTranslation, SentenceTranslation, VocabularyTranslation };
